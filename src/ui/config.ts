export const TOGETHER_MODELS_URL = "https://api.together.ai/v1/models";
export const TOGETHER_CHAT_URL = "https://api.together.ai/v1/chat/completions";
export const DEFAULT_MODEL = process.env.TOGETHER_MODEL ?? "Qwen/Qwen3.5-9B";
export const TEXT_MODEL_TYPES = ["chat", "language", "code"] as const;

export function togetherApiKey(): string {
  const value = process.env.TOGETHER_API_KEY;
  if (!value) throw new Error("TOGETHER_API_KEY is required.");
  return value;
}
