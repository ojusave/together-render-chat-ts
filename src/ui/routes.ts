import type { Express } from "express";
import { completeUiChat, readUiChat } from "./chat.js";
import { DEFAULT_MODEL } from "./config.js";
import { isKnownTextModel, listTextModels } from "./models.js";

export function mountUi(app: Express): void {
  app.get("/ui/models", async (_req, res) => {
    const models = await listTextModels();
    res.json({ default: DEFAULT_MODEL, models });
  });

  app.post("/ui/chat", async (req, res) => {
    const parsed = readUiChat(req.body);
    if (!parsed) {
      return res.status(400).json({
        error:
          'Body must include a "messages" array ending in a user turn.',
      });
    }
    if (!(await isKnownTextModel(parsed.model))) {
      return res.status(400).json({
        error: "Unknown model. Pick one from GET /ui/models.",
      });
    }
    const result = await completeUiChat(parsed.model, parsed.messages);
    if (!result.ok) return res.status(result.status).json(result.body);
    return res.json({
      model: result.model,
      reply: result.reply,
      usage: result.usage,
    });
  });
}
