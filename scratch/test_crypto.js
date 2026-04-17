const { createHmac } = require("node:crypto");
const { webcrypto } = require("node:crypto");

async function test() {
  const sessionSecret = "my-secret-key";
  const payload = "admin:1234567890";
  
  const signature = createHmac("sha256", sessionSecret).update(payload).digest("hex");
  console.log("Node HMAC signature:", signature);
  
  function hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let index = 0; index < hex.length; index += 2) {
      bytes[index / 2] = parseInt(hex.slice(index, index + 2), 16);
    }
    return bytes;
  }
  
  const signatureBytes = hexToBytes(signature);
  const encoder = new TextEncoder();
  
  const cryptoKey = await webcrypto.subtle.importKey(
    "raw",
    encoder.encode(sessionSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  
  const isValid = await webcrypto.subtle.verify(
    "HMAC",
    cryptoKey,
    signatureBytes,
    encoder.encode(payload)
  );
  
  console.log("Subtle Crypto Verify result:", isValid);
}

test();
