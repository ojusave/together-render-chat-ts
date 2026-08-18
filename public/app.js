import { renderSignupUrlWithUtms } from "./renderSignup.js";
import { createThread } from "./js/chat.js";
import { loadModelPicker, selectedModel } from "./js/models.js";

const signup = document.getElementById("signup");
const form = document.getElementById("chat-form");
const messageEl = document.getElementById("message");
const sendEl = document.getElementById("send");
const threadEl = document.getElementById("thread");
const laneEl = document.getElementById("lane");
const statusEl = document.getElementById("status");
const modelEl = document.getElementById("model");
const modelFilterEl = document.getElementById("model-filter");

if (signup instanceof HTMLAnchorElement) {
  signup.href = renderSignupUrlWithUtms("navbar_button");
}

const thread = createThread(laneEl, threadEl);

if (modelEl instanceof HTMLSelectElement) {
  loadModelPicker(modelEl, modelFilterEl).catch(() => {
    if (statusEl) statusEl.textContent = "Could not load Together models.";
  });
}

async function sendMessage() {
  const message =
    messageEl instanceof HTMLTextAreaElement ? messageEl.value.trim() : "";
  if (!message) return;
  if (sendEl instanceof HTMLButtonElement && sendEl.disabled) return;

  if (messageEl instanceof HTMLTextAreaElement) messageEl.value = "";
  if (sendEl instanceof HTMLButtonElement) sendEl.disabled = true;
  if (statusEl) statusEl.textContent = "Thinking…";

  try {
    await thread.send(message, selectedModel(modelEl));
    if (statusEl) statusEl.textContent = "";
  } catch (error) {
    const text = error instanceof Error ? error.message : "Request failed.";
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
