const test = require("node:test");
const assert = require("node:assert");
const { assertRequiredSecrets, REQUIRED_SECRETS } = require("../build/config/required-secrets");

test("passes when every key is present", () => {
  assert.doesNotThrow(() => assertRequiredSecrets({ FIREBASE_SERVICE_ACCOUNT: { privateKey: "x" }, TATUM_SOLANA_KEY: "x" }, REQUIRED_SECRETS));
});

test("lists every missing key in one error", () => {
  assert.throws(() => assertRequiredSecrets({}, ["FIREBASE_SERVICE_ACCOUNT", "SSL.KEY"]), {
    message: "Missing ZooKeeper config keys: FIREBASE_SERVICE_ACCOUNT, SSL.KEY",
  });
});

test("treats an empty value as missing", () => {
  assert.throws(() => assertRequiredSecrets({ SSL: { KEY: "" } }, ["SSL.KEY"]), /SSL\.KEY/);
});

test("requires the Firebase service account", () => {
  assert.ok(REQUIRED_SECRETS.includes("FIREBASE_SERVICE_ACCOUNT"));
});

test("requires the Tatum Solana node key", () => {
  assert.ok(REQUIRED_SECRETS.includes("TATUM_SOLANA_KEY"));
  assert.throws(() => assertRequiredSecrets({ FIREBASE_SERVICE_ACCOUNT: { privateKey: "x" } }, REQUIRED_SECRETS), /TATUM_SOLANA_KEY/);
});

test("no source file still carries a redacted placeholder", () => {
  const { execSync } = require("child_process");
  const hits = execSync("git grep -n REDACTED -- src || true", { encoding: "utf8" }).trim();
  assert.strictEqual(hits, "");
});
