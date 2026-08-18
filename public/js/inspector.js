function pretty(value) {
  return JSON.stringify(value, null, 2);
}

function usageValue(usage, key) {
  if (!usage || typeof usage !== "object") return "-";
  const value = usage[key];
  return typeof value === "number" ? String(value) : "-";
}

function curlForChat(message) {
  const body = JSON.stringify({ message });
  return `curl -X POST "$SERVICE_URL/chat" \\
  -H "Authorization: Bearer $CHAT_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '${body.replace(/'/g, `'\\''`)}'`;
}

export function createInspector(root) {
  if (!root) {
    return { update() {} };
  }

  const empty = root.querySelector("#inspector-empty");
  const body = root.querySelector("#inspector-body");
  const statModel = root.querySelector("#stat-model");
  const statPrompt = root.querySelector("#stat-prompt");
  const statCompletion = root.querySelector("#stat-completion");
  const statTotal = root.querySelector("#stat-total");
  const requestEl = root.querySelector("#inspector-request");
  const responseEl = root.querySelector("#inspector-response");
  const curlEl = root.querySelector("#inspector-curl");

  root.addEventListener("click", async (event) => {
    const button = event.target instanceof Element
      ? event.target.closest("[data-copy]")
      : null;
    if (!(button instanceof HTMLButtonElement)) return;
    const target = root.querySelector(`#${button.dataset.copy}`);
    const text = target?.textContent ?? "";
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      const previous = button.textContent;
      button.textContent = "Copied";
      window.setTimeout(() => {
        button.textContent = previous;
      }, 1200);
    } catch {
      button.textContent = "Copy failed";
    }
  });

  function reveal() {
    empty?.setAttribute("hidden", "");
    body?.removeAttribute("hidden");
  }

  function update({ request, response, error }) {
    reveal();
    if (requestEl) requestEl.textContent = pretty(request);
    const lastUser = [...(request?.messages ?? [])]
      .reverse()
      .find((turn) => turn.role === "user");
    if (curlEl) curlEl.textContent = curlForChat(lastUser?.content ?? "");

    if (error) {
      if (statModel) statModel.textContent = request?.model || "-";
      if (statPrompt) statPrompt.textContent = "-";
      if (statCompletion) statCompletion.textContent = "-";
      if (statTotal) statTotal.textContent = "-";
      if (responseEl) responseEl.textContent = pretty({ error });
      return;
    }

    if (statModel) statModel.textContent = response?.model || request?.model || "-";
    if (statPrompt) statPrompt.textContent = usageValue(response?.usage, "prompt_tokens");
    if (statCompletion)
      statCompletion.textContent = usageValue(response?.usage, "completion_tokens");
    if (statTotal) statTotal.textContent = usageValue(response?.usage, "total_tokens");
    if (responseEl) {
      responseEl.textContent = pretty({
        model: response?.model,
        usage: response?.usage ?? null,
        reply: response?.reply ?? null,
      });
    }
  }

  return { update };
}
