import { renderSignupUrlWithUtms } from "./renderSignup.js";

const signup = document.getElementById("signup");
const healthEl = document.getElementById("health");
const form = document.getElementById("chat-form");
const keyEl = document.getElementById("chat-key");
const messageEl = document.getElementById("message");
const sendEl = document.getElementById("send");
const outputEl = document.getElementById("output");
const statusEl = document.getElementById("status");

if (signup instanceof HTMLAnchorElement) {
  signup.href = renderSignupUrlWithUtms("navbar_button");
}

async function loadHealth() {
  try {
    const res = await fetch("/health");
    const data = await res.json();
    if (healthEl) {
      healthEl.textContent = data.ok
        ? `Healthy. Model: ${data.model}`
        : "Health check failed.";
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
  const key = keyEl instanceof HTMLInputElement ? keyEl.value.trim() : "";
  const message =
    messageEl instanceof HTMLTextAreaElement ? messageEl.value.trim() : "";
  if (!key || !message) return;

  if (sendEl instanceof HTMLButtonElement) sendEl.disabled = true;
  if (statusEl) statusEl.textContent = "Sending…";
  if (outputEl) outputEl.textContent = "";

  try {
    const res = await fetch("/chat", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || data.detail || `HTTP ${res.status}`);
    }
    if (outputEl) outputEl.textContent = JSON.stringify(data, null, 2);
    if (statusEl) statusEl.textContent = "Reply received.";
  } catch (error) {
    const text = error instanceof Error ? error.message : "Request failed.";
    if (statusEl) {
      statusEl.textContent = text;
      statusEl.className = "status err";
    }
  } finally {
    if (sendEl instanceof HTMLButtonElement) sendEl.disabled = false;
  }
});

loadHealth();
