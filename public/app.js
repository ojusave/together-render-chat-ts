import { renderSignupUrlWithUtms } from "./renderSignup.js";

const signup = document.getElementById("signup");
const healthEl = document.getElementById("health");
const form = document.getElementById("chat-form");
const messageEl = document.getElementById("message");
const sendEl = document.getElementById("send");
const threadEl = document.getElementById("thread");
const laneEl = document.getElementById("lane");
const statusEl = document.getElementById("status");

/** @type {{ role: "user" | "assistant"; content: string }[]} */
const history = [];

if (signup instanceof HTMLAnchorElement) {
  signup.href = renderSignupUrlWithUtms("navbar_button");
}

function addBubble(role, text) {
  if (!laneEl) return;
  const empty = laneEl.querySelector(".empty");
  empty?.remove();
  const bubble = document.createElement("div");
  bubble.className = `bubble ${role}`;
  bubble.textContent = text;
  laneEl.append(bubble);
  if (threadEl) threadEl.scrollTop = threadEl.scrollHeight;
  return bubble;
}

async function loadHealth() {
  try {
    const res = await fetch("/health");
    const data = await res.json();
    if (healthEl) {
      healthEl.textContent = data.ok ? data.model : "Health check failed.";
      healthEl.className = data.ok ? "status ok" : "status err";
    }
  } catch {
    if (healthEl) {
      healthEl.textContent = "Could not reach /health.";
      healthEl.className = "status err";
    }
  }
}

async function sendMessage() {
  const message =
    messageEl instanceof HTMLTextAreaElement ? messageEl.value.trim() : "";
  if (!message) return;
  if (sendEl instanceof HTMLButtonElement && sendEl.disabled) return;

  addBubble("user", message);
  history.push({ role: "user", content: message });
  if (messageEl instanceof HTMLTextAreaElement) messageEl.value = "";
  if (sendEl instanceof HTMLButtonElement) sendEl.disabled = true;
  if (statusEl) statusEl.textContent = "Thinking…";
  const pending = addBubble("assistant pending", "Thinking…");

  try {
    const res = await fetch("/ui/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history.slice(-40) }),
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
    if (statusEl) statusEl.textContent = "";
  } catch (error) {
    const text = error instanceof Error ? error.message : "Request failed.";
    pending?.remove();
    addBubble("error", text);
    if (statusEl) statusEl.textContent = text;
  } finally {
    if (sendEl instanceof HTMLButtonElement) sendEl.disabled = false;
    messageEl instanceof HTMLTextAreaElement && messageEl.focus();
  }
}

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  void sendMessage();
});

messageEl?.addEventListener("keydown", (event) => {
  if (!(event instanceof KeyboardEvent)) return;
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    void sendMessage();
  }
});

loadHealth();
