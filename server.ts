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

type ChatTurn = { role: "user" | "assistant"; content: string };

type ChatResult =
  | { ok: true; model: string; reply: string; usage: unknown }
  | { ok: false; status: number; body: Record<string, unknown> };

function isAuthorized(header: string | undefined): boolean {
  if (!header?.startsWith("Bearer ")) return false;

  const supplied = Buffer.from(header.slice(7));
  const expected = Buffer.from(CHAT_API_KEY);
  return (
    supplied.length === expected.length && timingSafeEqual(supplied, expected)
  );
}

async function completeChat(messages: ChatTurn[]): Promise<ChatResult> {
  try {
    const upstream = await fetch(TOGETHER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOGETHER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        reasoning: { enabled: false },
        max_tokens: 512,
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!upstream.ok) {
      const detail = (await upstream.text()).slice(0, 500);
      console.error("Together error", upstream.status, detail);
      return {
        ok: false,
        status: 502,
        body: {
          error: "Upstream inference failed",
          upstreamStatus: upstream.status,
        },
      };
    }

    const data = (await upstream.json()) as TogetherResponse;
    const reply = data.choices?.[0]?.message?.content;
    if (typeof reply !== "string" || !reply) {
      return {
        ok: false,
        status: 502,
        body: { error: "Together returned an invalid response." },
      };
    }

    return {
      ok: true,
      model: data.model ?? MODEL,
      reply,
      usage: data.usage,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      return {
        ok: false,
        status: 504,
        body: { error: "Together timed out after 60 seconds." },
      };
    }

    console.error("Together request failed", error);
    return { ok: false, status: 502, body: { error: "Could not reach Together." } };
  }
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

  const result = await completeChat([
    { role: "user", content: message.trim() },
  ]);
  if (!result.ok) return res.status(result.status).json(result.body);
  return res.json({
    model: result.model,
    reply: result.reply,
    usage: result.usage,
  });
});

function readMessages(body: unknown): ChatTurn[] | null {
  const raw =
    typeof body === "object" && body !== null && "messages" in body
      ? (body as { messages?: unknown }).messages
      : undefined;
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const cleaned: ChatTurn[] = [];
  for (const turn of raw.slice(-40)) {
    if (typeof turn !== "object" || turn === null) return null;
    const role = "role" in turn ? String((turn as { role: unknown }).role) : "";
    const content =
      "content" in turn ? (turn as { content?: unknown }).content : undefined;
    if (
      (role !== "user" && role !== "assistant") ||
      typeof content !== "string" ||
      !content.trim() ||
      content.length > 8000
    ) {
      return null;
    }
    cleaned.push({ role, content: content.trim() });
  }
  if (cleaned[cleaned.length - 1]?.role !== "user") return null;
  return cleaned;
}

app.post("/ui/chat", async (req, res) => {
  const messages = readMessages(req.body);
  if (!messages) {
    return res.status(400).json({
      error: 'Body must include a "messages" array ending in a user turn.',
    });
  }
  const result = await completeChat(messages);
  if (!result.ok) return res.status(result.status).json(result.body);
  return res.json({
    model: result.model,
    reply: result.reply,
    usage: result.usage,
  });
});

app.use(express.static("public"));

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

const port = Number(process.env.PORT) || 3000;
app.listen(port, "0.0.0.0", () => console.log(`listening on ${port}`));
