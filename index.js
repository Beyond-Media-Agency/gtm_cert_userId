const functions = require("@google-cloud/functions-framework");
const CryptoJS = require("crypto-js");
const { PubSub } = require("@google-cloud/pubsub");
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const dotenv = require("dotenv");

dotenv.config();

initializeApp({
  credential: cert(process.env.SVC_ACC_FILE),
});

const db = getFirestore();

const encrypt_deterministic = (text, key) => {
  const hash = CryptoJS.SHA256(key);
  const ciphertext = CryptoJS.AES.encrypt(text, hash, {
    mode: CryptoJS.mode.ECB,
  });
  return ciphertext.toString();
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

  const cyphertext = encrypt_deterministic(process.env.PRIVATE_KEY, email);

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
