import { renderSignupUrlWithUtms } from "./renderSignup.js";

const signup = document.getElementById("signup");
const healthEl = document.getElementById("health");
const form = document.getElementById("chat-form");
const messageEl = document.getElementById("message");
const sendEl = document.getElementById("send");
const threadEl = document.getElementById("thread");
const statusEl = document.getElementById("status");

if (signup instanceof HTMLAnchorElement) {
  signup.href = renderSignupUrlWithUtms("navbar_button");
}

function addBubble(role, text) {
  if (!threadEl) return;
  const empty = threadEl.querySelector(".empty");
  empty?.remove();
  const bubble = document.createElement("div");
  bubble.className = `bubble ${role}`;
  bubble.textContent = text;
  threadEl.append(bubble);
  threadEl.scrollTop = threadEl.scrollHeight;
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

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message =
    messageEl instanceof HTMLTextAreaElement ? messageEl.value.trim() : "";
  if (!message) return;

  addBubble("user", message);
  if (messageEl instanceof HTMLTextAreaElement) messageEl.value = "";
  if (sendEl instanceof HTMLButtonElement) sendEl.disabled = true;
  if (statusEl) {
    statusEl.textContent = "Thinking…";
    statusEl.className = "status";
  }

  try {
    const res = await fetch("/ui/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || data.detail?.message || data.detail || `HTTP ${res.status}`);
    }
    addBubble("assistant", data.reply);
    if (statusEl) statusEl.textContent = "";
  } catch (error) {
    const text = error instanceof Error ? error.message : "Request failed.";
    addBubble("assistant", text);
    if (statusEl) {
      statusEl.textContent = text;
      statusEl.className = "status err";
    }
  } finally {
    if (sendEl instanceof HTMLButtonElement) sendEl.disabled = false;
  }
});

loadHealth();
