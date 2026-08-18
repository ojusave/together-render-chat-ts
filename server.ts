import { timingSafeEqual } from "node:crypto";
import express, { type ErrorRequestHandler } from "express";

const app = express();
app.use(express.json({ limit: "16kb" }));

const TOGETHER_URL = "https://api.together.ai/v1/chat/completions";
const MODEL = process.env.TOGETHER_MODEL ?? "Qwen/Qwen3.5-9B";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

const TOGETHER_API_KEY = requiredEnv("TOGETHER_API_KEY");
const CHAT_API_KEY = requiredEnv("CHAT_API_KEY");

type TogetherResponse = {
  model?: string;
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: unknown;
};

function isAuthorized(header: string | undefined): boolean {
  if (!header?.startsWith("Bearer ")) return false;

  const supplied = Buffer.from(header.slice(7));
  const expected = Buffer.from(CHAT_API_KEY);
  return (
    supplied.length === expected.length && timingSafeEqual(supplied, expected)
  );
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, model: MODEL });
});

app.post("/chat", async (req, res) => {
  if (!isAuthorized(req.get("authorization"))) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const message = req.body?.message;
  if (typeof message !== "string" || !message.trim() || message.length > 8000) {
    return res.status(400).json({
      error:
        'Body must include a non-empty "message" string of at most 8000 characters.',
    });
  }

  try {
    const upstream = await fetch(TOGETHER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOGETHER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: message.trim() }],
        reasoning: { enabled: false },
        max_tokens: 512,
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!upstream.ok) {
      const detail = (await upstream.text()).slice(0, 500);
      console.error("Together error", upstream.status, detail);
      return res.status(502).json({
        error: "Upstream inference failed",
        upstreamStatus: upstream.status,
      });
    }

    const data = (await upstream.json()) as TogetherResponse;
    const reply = data.choices?.[0]?.message?.content;
    if (typeof reply !== "string" || !reply) {
      return res
        .status(502)
        .json({ error: "Together returned an invalid response." });
    }

    return res.json({
      model: data.model ?? MODEL,
      reply,
      usage: data.usage,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      return res
        .status(504)
        .json({ error: "Together timed out after 60 seconds." });
    }

    console.error("Together request failed", error);
    return res.status(502).json({ error: "Could not reach Together." });
  }
});

const requestErrorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const type =
    typeof error === "object" && error !== null && "type" in error
      ? String(error.type)
      : "";

  if (type === "entity.parse.failed") {
    return res.status(400).json({ error: "Request body must be valid JSON." });
  }
  if (type === "entity.too.large") {
    return res.status(413).json({ error: "Request body is too large." });
  }

  console.error("Unhandled request error", error);
  return res.status(500).json({ error: "Internal server error." });
};
app.use(requestErrorHandler);

export { app };
