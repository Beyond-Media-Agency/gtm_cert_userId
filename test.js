const CryptoJS = require("crypto-js");
const dotenv = require("dotenv");

dotenv.config();

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

const value = "mail2";
const encrypted = encrypt_deterministic(value, process.env.PRIVATE_KEY);

console.log(`Original value: ${value}`);
console.log(`Encrypted: ${encrypted}`);
const decrypted = decrypt_deterministic(encrypted, process.env.PRIVATE_KEY);

console.log(`Decrypted: ${decrypted}`);
console.log(`Equal   : ${decrypted === value}`);
