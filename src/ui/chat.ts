import { DEFAULT_MODEL, TOGETHER_CHAT_URL, togetherApiKey } from "./config.js";

type TogetherResponse = {
  model?: string;
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: unknown;
};

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type ChatResult =
  | { ok: true; model: string; reply: string; usage: unknown }
  | { ok: false; status: number; body: Record<string, unknown> };

export async function completeUiChat(
  model: string,
  messages: ChatTurn[],
): Promise<ChatResult> {
  try {
    const upstream = await fetch(TOGETHER_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${togetherApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
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
      model: data.model ?? model,
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

export function readUiChat(body: unknown): {
  model: string;
  messages: ChatTurn[];
} | null {
  if (typeof body !== "object" || body === null) return null;
  const modelRaw = "model" in body ? (body as { model?: unknown }).model : "";
  const model =
    typeof modelRaw === "string" && modelRaw.trim()
      ? modelRaw.trim()
      : DEFAULT_MODEL;
  if (model.length > 200) return null;

  const raw =
    "messages" in body ? (body as { messages?: unknown }).messages : undefined;
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const messages: ChatTurn[] = [];
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
    messages.push({ role, content: content.trim() });
  }
  if (messages[messages.length - 1]?.role !== "user") return null;
  return { model, messages };
}
