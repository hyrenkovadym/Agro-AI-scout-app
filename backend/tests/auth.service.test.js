import assert from "node:assert/strict";
import test from "node:test";
import { createSessionManager, hashPassword, verifyPassword } from "../src/services/auth.service.js";

test("hashPassword + verifyPassword handle valid and invalid credentials", () => {
  const password = "secure-pass-123";
  const hash = hashPassword(password);

  assert.equal(typeof hash, "string");
  assert.equal(hash.includes("$"), true);
  assert.equal(verifyPassword(password, hash), true);
  assert.equal(verifyPassword("wrong-password", hash), false);
  assert.equal(verifyPassword(password, "invalid"), false);
});

test("session manager issues and expires tokens", () => {
  let now = 1000;
  const manager = createSessionManager({
    sessionTtlHours: 1,
    now: () => now,
  });

  const token = manager.issueToken("user-1");
  assert.equal(typeof token, "string");

  const active = manager.getSession(token);
  assert.equal(active?.userId, "user-1");

  now += 61 * 60 * 1000;
  const expired = manager.getSession(token);
  assert.equal(expired, null);
});

