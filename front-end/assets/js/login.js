"use strict";

const API_URL = "http://localhost:8080";
const AUTH_STORAGE_KEY = "apice.auth";
const form = document.querySelector("#login-form");
const message = document.querySelector("#login-message");
const submitButton = document.querySelector("#login-submit");

function showMessage(text) {
  message.textContent = text;
  message.classList.add("visible");
}

function returnDestination() {
  const requested = new URLSearchParams(window.location.search).get("returnTo") || "index.html";
  if (requested.startsWith("/") || requested.includes(":") || requested.startsWith("//")) return "index.html";
  const safePath = requested.replace(/\\/g, "/");
  if (!/^(index\.html|pages\/(?:atletas|atleta|sessoes|captacoes)\.html)(?:\?.*)?$/.test(safePath)) {
    return "index.html";
  }
  return safePath;
}

if (sessionStorage.getItem(AUTH_STORAGE_KEY)) {
  window.location.replace(returnDestination());
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.classList.remove("visible");
  submitButton.disabled = true;
  submitButton.textContent = "Conectando...";

  const data = new FormData(form);
  const username = String(data.get("username")).trim();
  const password = String(data.get("password"));
  const encoded = btoa(unescape(encodeURIComponent(`${username}:${password}`)));

  try {
    const response = await fetch(`${API_URL}/api/atletas`, {
      headers: { Authorization: `Basic ${encoded}` },
    });
    if (response.status === 401 || response.status === 403) {
      showMessage("Usuário ou senha incorretos. Confira seus dados e tente novamente.");
      return;
    }
    if (!response.ok) {
      showMessage("Não foi possível entrar agora. Tente novamente em instantes.");
      return;
    }
    sessionStorage.setItem(AUTH_STORAGE_KEY, encoded);
    window.location.replace(returnDestination());
  } catch {
    showMessage("Não foi possível conectar ao sistema. Verifique sua conexão ou peça ajuda ao responsável.");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Entrar";
  }
});
