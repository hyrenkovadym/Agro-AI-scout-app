import assert from "node:assert/strict";
import test from "node:test";
import {
  asOptionalText,
  asText,
  estimateBase64Bytes,
  isLikelyBase64,
  isSupportedImageMimeType,
  isValidEmail,
  isValidLanguageCode,
  normalizeEmail,
  sanitizeFlexibleArray,
} from "../src/utils/validation.js";

test("asText/asOptionalText trim values safely", () => {
  assert.equal(asText("  hello  "), "hello");
  assert.equal(asText(123), "");
  assert.equal(asOptionalText("   "), null);
  assert.equal(asOptionalText(" ok "), "ok");
});

test("email and language validators support expected formats", () => {
  assert.equal(normalizeEmail(" Test@Example.com "), "test@example.com");
  assert.equal(isValidEmail("test@example.com"), true);
  assert.equal(isValidEmail("broken@email"), false);

  assert.equal(isValidLanguageCode("uk"), true);
  assert.equal(isValidLanguageCode("pt-BR"), true);
  assert.equal(isValidLanguageCode("a"), false);
});

test("array and image validators sanitize and verify content", () => {
  assert.deepEqual(sanitizeFlexibleArray("one, two; three"), ["one", "two", "three"]);
  assert.equal(isSupportedImageMimeType("image/jpeg"), true);
  assert.equal(isSupportedImageMimeType("image/gif"), false);

  const base64 = Buffer.from("demo").toString("base64");
  assert.equal(isLikelyBase64(base64), true);
  assert.ok(estimateBase64Bytes(base64) > 0);
});
