import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import { createTestApp } from "./helpers/createTestApp.js";

test("GET /health returns API status and counters", async (t) => {
  const { app, cleanup } = await createTestApp();
  t.after(async () => {
    await cleanup();
  });

  const response = await request(app).get("/health");

  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.model, "gpt-5");
  assert.equal(response.body.hasApiKey, false);
  assert.equal(response.body.users, 0);
  assert.equal(response.body.clients, 0);
  assert.equal(response.body.analyses, 0);
  assert.equal(typeof response.body.timestamp, "string");
});

