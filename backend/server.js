import "dotenv/config";
import { createApiApp } from "./src/app.js";
import { loadConfig } from "./src/config.js";

export const config = loadConfig();
export const app = createApiApp({ config });

if (process.env.NODE_ENV !== "test") {
  app.listen(config.port, () => {
    console.log(`Agro AI backend is running on http://localhost:${config.port}`);
    if (!config.openAiApiKey) {
      console.warn("Warning: OPENAI_API_KEY is empty. /analyze-plant will return 503.");
    }
  });
}

