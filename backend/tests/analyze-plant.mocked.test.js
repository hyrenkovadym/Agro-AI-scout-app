import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import { createTestApp } from "./helpers/createTestApp.js";

const makeMockAiClient = () => ({
  responses: {
    create: async () => ({
      output_text: JSON.stringify({
        problemName: "Likely nitrogen deficiency",
        probablePlant: "Corn",
        probablePlantAlternatives: ["Sorghum"],
        botanicalName: "Zea mays",
        probability: "medium",
        category: "nutrient deficiency",
        whatSeen: "Leaf yellowing on lower leaves",
        possibleCauses: ["Nutrient imbalance"],
        recommendedActions: ["Apply balanced fertilizer"],
        whatToAdd: ["Nitrogen-rich feed"],
        additionalChecks: ["Check soil test values"],
        descriptionImpact: "User context matched the visual signs.",
        notes: "Preliminary recommendation only.",
        confidence: 62,
      }),
    }),
  },
});

const registerAndCreateClient = async (app) => {
  const registerResponse = await request(app).post("/auth/register").send({
    name: "Tester",
    email: "tester@example.com",
    password: "password123",
  });

  assert.equal(registerResponse.status, 201);
  const token = registerResponse.body.token;
  assert.equal(typeof token, "string");

  const clientResponse = await request(app)
    .post("/clients")
    .set("Authorization", `Bearer ${token}`)
    .send({
      name: "Demo Farm",
      crop: "Corn",
      notes: "test client",
    });

  assert.equal(clientResponse.status, 201);
  return {
    token,
    clientId: clientResponse.body.client.id,
  };
};

test("POST /analyze-plant works with mocked AI client", async (t) => {
  const { app, cleanup } = await createTestApp({
    aiClient: makeMockAiClient(),
    openAiApiKey: "test-key",
  });
  t.after(async () => {
    await cleanup();
  });

  const { token, clientId } = await registerAndCreateClient(app);
  const imageBase64 = Buffer.from("fake-image-content").toString("base64");

  const response = await request(app)
    .post("/analyze-plant")
    .set("Authorization", `Bearer ${token}`)
    .send({
      clientId,
      imageBase64,
      imageMimeType: "image/jpeg",
      context: "Leaves started yellowing this week.",
      expectedPlant: "Corn",
      language: "en",
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.analysis.clientId, clientId);
  assert.equal(response.body.analysis.diagnosis.problemName, "Likely nitrogen deficiency");
  assert.equal(response.body.analysis.diagnosis.category, "nutrient deficiency");
});

test("POST /analyze-plant returns 503 when AI key is missing", async (t) => {
  const { app, cleanup } = await createTestApp({
    aiClient: null,
    openAiApiKey: "",
  });
  t.after(async () => {
    await cleanup();
  });

  const { token, clientId } = await registerAndCreateClient(app);
  const imageBase64 = Buffer.from("fake-image-content").toString("base64");

  const response = await request(app)
    .post("/analyze-plant")
    .set("Authorization", `Bearer ${token}`)
    .send({
      clientId,
      imageBase64,
      imageMimeType: "image/jpeg",
    });

  assert.equal(response.status, 503);
  assert.equal(response.body.error, "OPENAI_API_KEY is missing in backend/.env");
});

