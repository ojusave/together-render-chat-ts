export function createThread(laneEl, threadEl) {
  /** @type {{ role: "user" | "assistant"; content: string }[]} */
  const history = [];

  function addBubble(role, text) {
    if (!laneEl) return;
    laneEl.querySelector(".empty")?.remove();
    const bubble = document.createElement("div");
    bubble.className = `bubble ${role}`;
    bubble.textContent = text;
    laneEl.append(bubble);
    if (threadEl) threadEl.scrollTop = threadEl.scrollHeight;
    return bubble;
  }

  async function send(message, model) {
    addBubble("user", message);
    history.push({ role: "user", content: message });
    const pending = addBubble("assistant pending", "Thinking…");
    try {
      const res = await fetch("/ui/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: history.slice(-40),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error || data.detail?.message || data.detail || `HTTP ${res.status}`
        );
      }
      pending?.remove();
      addBubble("assistant", data.reply);
      history.push({ role: "assistant", content: data.reply });
      return data;
    } catch (error) {
      pending?.remove();
      const text = error instanceof Error ? error.message : "Request failed.";
      addBubble("error", text);
      throw error;
    }
  }

  return { send };
}
