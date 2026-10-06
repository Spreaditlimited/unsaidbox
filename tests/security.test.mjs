import test from "node:test";
import assert from "node:assert/strict";
import {
  hashPassword,
  verifyPassword,
  token,
  digest,
  usernameValue,
  textValue,
} from "../lib/security.mjs";
test("password hashes use random salts and verify correctly", async () => {
  const p = "Testing-only-password-123";
  const a = await hashPassword(p),
    b = await hashPassword(p);
  assert.notEqual(a, b);
  assert.equal(await verifyPassword(p, a), true);
  assert.equal(await verifyPassword("wrong", a), false);
  assert.equal(await verifyPassword(p, "malformed"), false);
  await assert.rejects(hashPassword("short"));
});
test("tokens are random, fixed length and hashed for database storage", () => {
  const a = token(),
    b = token();
  assert.match(a, /^[a-f0-9]{64}$/);
  assert.notEqual(a, b);
  assert.notEqual(digest(a), a);
  assert.equal(digest(a), digest(a));
});
test("usernames and message lengths are validated on server", () => {
  assert.equal(usernameValue("Test_user"), "test_user");
  for (const value of ["admin", "ab", "a/b", "<script>"])
    assert.throws(() => usernameValue(value));
  assert.throws(() => textValue("   ", "Message", 5000));
  assert.throws(() => textValue("x".repeat(5001), "Message", 5000));
  assert.equal(textValue(" hi ", "Message", 5000), "hi");
});
