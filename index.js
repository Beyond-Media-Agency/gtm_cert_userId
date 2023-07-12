const functions = require("@google-cloud/functions-framework");
const CryptoJS = require("crypto-js");
const { PubSub } = require("@google-cloud/pubsub");
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const dotenv = require("dotenv");
const assert = require("assert");
const { BigQuery } = require("@google-cloud/bigquery");

dotenv.config();

initializeApp({
  credential: cert(process.env.SVC_ACC_FILE),
});

const db = getFirestore();
const bigquery = new BigQuery();

const encrypt_deterministic = (text, key) => {
  const hash = CryptoJS.SHA256(key);
  const ciphertext = CryptoJS.AES.encrypt(text, hash, {
    mode: CryptoJS.mode.ECB,
  });
  return ciphertext.toString();
};

const decrypt_deterministic = (text, key) => {
  const hash = CryptoJS.SHA256(key);
  return CryptoJS.AES.decrypt(text, hash, { mode: CryptoJS.mode.ECB }).toString(
    CryptoJS.enc.Utf8
  );
};

functions.http("hash", async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "GET");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Access-Control-Max-Age", "3600");
    res.status(204).send("");
    return;
  }

  const email = req.query.email;
  if (!email) {
    res.status(400).send(JSON.stringify({}));
    return;
  }

  const cyphertext = encrypt_deterministic(email, process.env.PRIVATE_KEY);

  if (process.env.SAVE_TO_DB === "TRUE") {
    const pubsub = new PubSub({ projectId: process.env.PROJECT_ID });

    const topic = pubsub.topic(process.env.TOPIC);

    const db_payload = {
      email,
      cyphertext,
    };

    topic.publishMessage({ data: Buffer.from(JSON.stringify(db_payload)) });
  }

  res.status(200).send(JSON.stringify({ response: cyphertext }));
});

functions.cloudEvent("save_to_db", async (event) => {
  const data = JSON.parse(atob(event.data.message.data));
  if (!data.email || !data.hash) {
    console.log(data);
    throw new Error("request malformada, falta email/hash");
  }

  const docRef = db.collection("hashes").doc(data.hash);
  if ((await docRef.get()).exists) {
    return;
  }

  await docRef.set({
    email: data.email,
  });
  return;
});

// Decrypt
// var bytes = CryptoJS.AES.decrypt(ciphertext, "secret key 123");
// var originalText = bytes.toString(CryptoJS.enc.Utf8);

functions.http("decrypt", (req, res) => {
  const request_body = req.body;

  assert("calls" in request_body, "La request no viene de BigQuery");

  const replies = request_body.calls.map((e) =>
    decrypt_deterministic(e[0], process.env.PRIVATE_KEY)
  );

  res.send(JSON.stringify({ replies }));
});

functions.cloudEvent("onTableCreated", async (event) => {
  console.log(JSON.stringify(event));
  const eventData = JSON.parse(
    Buffer.from(event.data.message.data, "base64").toString()
  );
  const source_dataset =
    eventData.protoPayload.serviceData.jobCompletedEvent.job.jobConfiguration
      .load.destinationTable.datasetId;
  const source_table =
    eventData.protoPayload.serviceData.jobCompletedEvent.job.jobConfiguration
      .load.destinationTable.tableId;
  const destination_dataset = "test_simoneti.decrypted_userId_test";

  const query = `
  INSERT INTO
    \`bq-test-283619.${destination_dataset}\`
  SELECT
    userId,
    randomData,
    \`bq-test-283619.test_simoneti.gtm_cert_decrypt_cloudFunction\`(userId) AS email
    FROM
      \`bq-test-283619.${source_dataset}.${source_table}\`
`;

  const options = {
    query: query,
    location: "us-central1",
  };

  const [job] = await bigquery.createQueryJob(options);
});
