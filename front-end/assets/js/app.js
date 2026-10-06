"use strict";

const API_DEFAULT = "http://localhost:8080";
const POLL_INTERVAL_MS = 15000;
const AUTH_STORAGE_KEY = "apice.auth";
const state = {
  apiUrl: API_DEFAULT,
  authToken: sessionStorage.getItem(AUTH_STORAGE_KEY) || "",
  athletes: [],
  sessions: [],
  captures: [],
  view: document.body.dataset.page || "inicio",
  selectedAthleteId: new URLSearchParams(window.location.search).get("id"),
  selectedSessionId: new URLSearchParams(window.location.search).get("id"),
  athleteSearch: "",
  captureSessionFilter: "all",
  lastUpdated: null,
  loading: false,
};

const page = document.querySelector("#page-content");
const modal = document.querySelector("#modal");
const modalForm = document.querySelector("#modal-form");
const modalContent = document.querySelector("#modal-content");
const toastRegion = document.querySelector("#toast-region");
const noticeRegion = document.querySelector("#notice-region");
const sectionNames = {
  inicio: "Visão geral",
  atletas: "Atletas",
  sessoes: "Sessões",
  captacoes: "Captações",
  atleta: "Perfil do atleta",
  sessao: "Análise da sessão",
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function numeric(value) {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

function formatNumber(value, digits = 1) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: digits }).format(numeric(value));
}

function formatDate(value, includeTime = false) {
  if (!value) return "—";
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(String(value));
  const date = dateOnly
    ? new Date(`${value}T12:00:00`)
    : new Date(value);
  if (Number.isNaN(date.getTime())) return escapeHtml(value);
  return new Intl.DateTimeFormat("pt-BR", includeTime
    ? { dateStyle: "short", timeStyle: "short" }
    : { dateStyle: "short" }).format(date);
}

function initials(name) {
  return String(name || "?").trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
}

function toast(message, isError = false) {
  const item = document.createElement("div");
  item.className = `toast${isError ? " error" : ""}`;
  item.textContent = message;
  toastRegion.append(item);
  window.setTimeout(() => item.remove(), 4200);
}

function showNotice(message) {
  noticeRegion.innerHTML = `<div class="notice"><span>${escapeHtml(message)}</span></div>`;
}

function clearNotice() {
  noticeRegion.replaceChildren();
}

function normalizeApiUrl() {
  return state.apiUrl.trim().replace(/\/+$/, "");
}

async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  if (path.startsWith("/api/atletas") && state.authToken) headers.set("Authorization", `Basic ${state.authToken}`);

  let response;
  try {
    response = await fetch(`${normalizeApiUrl()}${path}`, { ...options, headers });
  } catch {
    throw new Error("Não foi possível conectar ao sistema. Verifique sua conexão ou tente novamente em instantes.");
  }

  if (!response.ok) {
    const responseText = await response.text();
    const details = responseText && responseText.length < 220 ? ` — ${responseText}` : "";
    if (response.status === 401 || response.status === 403) {
      throw new Error("Seu acesso expirou. Saia e entre novamente para continuar.");
    }
    if (response.status >= 500) {
      throw new Error("O sistema está temporariamente indisponível. Tente novamente em instantes.");
    }
    throw new Error(`Não foi possível concluir a operação. Tente novamente.${details}`);
  }
  if (response.status === 204) return null;
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return null;
  return response.json();
}

function apiErrorMessage(error) {
  return error instanceof Error ? error.message : "Ocorreu um erro inesperado ao acessar a API.";
}

async function loadData({ silent = false } = {}) {
  if (state.loading) return;
  state.loading = true;
  document.querySelector("#sync-text").textContent = "Atualizando dados";

  const requests = await Promise.allSettled([
    apiRequest("/api/atletas"),
    apiRequest("/api/sessoes"),
    apiRequest("/api/saltos"),
  ]);
  const failures = [];
  const [athletesResult, sessionsResult, capturesResult] = requests;

  if (athletesResult.status === "fulfilled") {
    state.athletes = Array.isArray(athletesResult.value) ? athletesResult.value : [];
  } else failures.push(`Atletas: ${apiErrorMessage(athletesResult.reason)}`);

  if (sessionsResult.status === "fulfilled") {
    state.sessions = Array.isArray(sessionsResult.value) ? sessionsResult.value : [];
  } else failures.push(`Sessões: ${apiErrorMessage(sessionsResult.reason)}`);

  if (capturesResult.status === "fulfilled") {
    state.captures = Array.isArray(capturesResult.value) ? capturesResult.value : [];
  } else failures.push(`Captações: ${apiErrorMessage(capturesResult.reason)}`);

  state.lastUpdated = new Date();
  state.loading = false;
  updateConnectionIndicator(failures.length === 0);
  render();

  if (failures.length) {
    showNotice(failures.join(" "));
    if (!silent) toast(failures[0], true);
  } else {
    clearNotice();
    if (!silent) toast("Dados atualizados com sucesso.");
  }
}

function updateConnectionIndicator(online) {
  const syncDot = document.querySelector("#sync-dot");
  const deviceDot = document.querySelector("#device-indicator");
  const syncText = document.querySelector("#sync-text");
  const deviceStatus = document.querySelector("#device-status");
  const liveIndicator = document.querySelector(".nav-live-dot");
  syncDot.classList.toggle("online", online);
  syncDot.classList.toggle("error", !online);
  deviceDot.classList.toggle("online", online);
  deviceDot.classList.toggle("error", !online);
  liveIndicator.classList.toggle("live", online);
  syncText.textContent = online
    ? `Sincronizado às ${state.lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
    : "API indisponível";
  deviceStatus.textContent = online ? "API conectada · dados ao vivo" : "Verifique a conexão da API";
}

function captureTimestamp(capture) {
  return capture.timestampSalto || capture.timestamp || capture.dataHora || "";
}

function sortCaptures(captures = state.captures) {
  return [...captures].sort((left, right) => new Date(captureTimestamp(right)) - new Date(captureTimestamp(left)));
}

function athleteById(id) {
  return state.athletes.find((athlete) => String(athlete.id) === String(id));
}

function sessionById(id) {
  return state.sessions.find((session) => String(session.id) === String(id));
}

function captureSession(capture) {
  if (capture.sessao && typeof capture.sessao === "object") return capture.sessao;
  return sessionById(capture.sessaoId);
}

function captureAthlete(capture) {
  const session = captureSession(capture);
  if (session?.atleta && typeof session.atleta === "object") return session.atleta;
  const athleteId = session?.atletaId ?? capture.atletaId;
  return athleteById(athleteId);
}

function athleteCaptures(id) {
  return state.captures.filter((capture) => {
    const athlete = captureAthlete(capture);
    return athlete && String(athlete.id) === String(id);
  });
}

function athleteSessions(id) {
  return state.sessions.filter((session) => {
    const athleteId = session.atleta?.id ?? session.atletaId;
    return String(athleteId) === String(id);
  });
}

function sessionCaptures(id) {
  return sortCaptures(state.captures.filter((capture) => {
    const sessionId = capture.sessao?.id ?? capture.sessaoId;
    return String(sessionId) === String(id);
  }));
}

function getAverageHeight(captures) {
  const heights = captures.map((capture) => numeric(capture.alturaEstimadaCm)).filter((height) => height > 0);
  return heights.length ? heights.reduce((total, height) => total + height, 0) / heights.length : 0;
}

function getBestHeight(captures) {
  return captures.reduce((best, capture) => Math.max(best, numeric(capture.alturaEstimadaCm)), 0);
}

function sectionHeader(eyebrow, title, description, actions = "") {
  return `<div class="page-heading"><div><p class="eyebrow">${escapeHtml(eyebrow)}</p><h1>${escapeHtml(title)}</h1><p class="page-description">${escapeHtml(description)}</p></div>${actions ? `<div class="heading-actions">${actions}</div>` : ""}</div>`;
}

function pageHref(view) {
  if (state.view === "inicio") {
    return view === "inicio" ? "index.html" : `pages/${view}.html`;
  }
  return view === "inicio" ? "../index.html" : `${view}.html`;
}

function button(action, label, className = "button", attributes = "") {
  return `<button class="${className}" type="button" data-action="${action}" ${attributes}>${label}</button>`;
}

function metricCard(label, value, unit, note, icon) {
  return `<article class="metric-card"><div class="metric-top"><span>${escapeHtml(label)}</span><span class="metric-icon">${icon}</span></div><div class="metric-value">${value}<small>${escapeHtml(unit)}</small></div><div class="metric-note">${escapeHtml(note)}</div></article>`;
}

function emptyState(title, description, actionLabel = "", action = "") {
  return `<div class="empty-state"><div><strong>${escapeHtml(title)}</strong>${escapeHtml(description)}${actionLabel ? `<div style="margin-top:14px">${button(action, escapeHtml(actionLabel), "button primary small")}</div>` : ""}</div></div>`;
}

function render() {
  document.querySelector("#current-section").textContent = sectionNames[state.view];
  document.querySelector("#nav-athlete-count").textContent = state.athletes.length;
  document.querySelectorAll(".nav-link").forEach((link) => {
    const activeView = state.view === "atleta" ? "atletas" : state.view === "sessao" ? "sessoes" : state.view;
    link.classList.toggle("active", link.dataset.view === activeView);
  });

  if (state.view === "inicio") page.innerHTML = renderDashboard();
  else if (state.view === "atletas") page.innerHTML = renderAthletes();
  else if (state.view === "atleta") page.innerHTML = renderAthleteProfile();
  else if (state.view === "sessao") page.innerHTML = renderSessionDashboard();
  else if (state.view === "sessoes") page.innerHTML = renderSessions();
  else page.innerHTML = renderCaptures();
}

function renderDashboard() {
  const recent = sortCaptures().slice(0, 5);
  const average = getAverageHeight(state.captures);
  const best = getBestHeight(state.captures);
  const actions = `${button("new-session", "+ Nova sessão", "button primary")}${button("new-athlete", "+ Atleta", "button ghost")}`;
  const athletes = state.athletes.slice(0, 3);
  return `${sectionHeader("CENTRO DE PERFORMANCE", "Desempenho em movimento.", "Acompanhe os indicadores e a evolução captados pelo sensor ESP32.", actions)}
    <div class="metrics-grid">
      ${metricCard("Atletas ativos", state.athletes.length, "atletas", "Perfis cadastrados na plataforma", "♙")}
      ${metricCard("Sessões registradas", state.sessions.length, "sessões", "Treinos disponíveis para análise", "◷")}
      ${metricCard("Saltos captados", state.captures.length, "registros", "Leituras recebidas pela API", "⌁")}
      ${metricCard("Maior salto", formatNumber(best), "cm", `Média geral de ${formatNumber(average)} cm`, "↗")}
    </div>
    <div class="dashboard-grid">
      <section class="panel"><div class="panel-header"><div><h2 class="panel-title">Evolução das captações</h2><p class="panel-subtitle">Altura estimada por salto · cm</p></div><span class="capture-badge"><i class="status-dot"></i>${state.captures.length} registros</span></div>
        <div class="chart-summary"><strong>${formatNumber(average)} cm</strong><span>média de altura</span></div>
        <div class="chart-wrap">${renderChart(sortCaptures().slice(0, 12).reverse())}</div>
      </section>
      <section class="panel"><div class="panel-header"><div><h2 class="panel-title">Atividade recente</h2><p class="panel-subtitle">Últimas leituras enviadas pelo ESP32</p></div><a class="inline-link" href="${pageHref("captacoes")}">Ver todas ↗</a></div>
        <div class="panel-body">${recent.length ? `<div class="recent-list">${recent.map(renderRecentCapture).join("")}</div>` : emptyState("Sem captações ainda", "As leituras recebidas do ESP32 aparecerão aqui.")}</div>
      </section>
    </div>
    <div class="section-row"><h2>Atletas</h2><a href="${pageHref("atletas")}">Ver todos ↗</a></div>
    ${athletes.length ? `<div class="athlete-cards">${athletes.map(renderAthleteCard).join("")}</div>` : `<section class="panel">${emptyState("Comece pelo primeiro perfil", "Cadastre um atleta para associar sessões e captações.", "Cadastrar atleta", "new-athlete")}</section>`}`;
}

function renderChart(captures) {
  const points = captures.map((capture) => numeric(capture.alturaEstimadaCm));
  if (!points.length || points.every((value) => value <= 0)) {
    return `<div class="chart-empty">O gráfico será preenchido assim que chegarem captações válidas.</div>`;
  }
  const width = 600;
  const height = 165;
  const left = 34;
  const right = 14;
  const top = 10;
  const bottom = 23;
  const max = Math.max(10, ...points) * 1.18;
  const min = Math.min(0, ...points) * .85;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const coordinates = points.map((value, index) => ({
    x: left + (points.length === 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth),
    y: top + plotHeight - ((value - min) / (max - min || 1)) * plotHeight,
  }));
  const path = coordinates.map((point, index) => `${index ? "L" : "M"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
  const area = `${path} L ${coordinates.at(-1).x.toFixed(1)} ${(top + plotHeight).toFixed(1)} L ${coordinates[0].x.toFixed(1)} ${(top + plotHeight).toFixed(1)} Z`;
  const grid = [0, .5, 1].map((fraction) => {
    const y = top + plotHeight - plotHeight * fraction;
    return `<line class="chart-gridline" x1="${left}" y1="${y}" x2="${width - right}" y2="${y}"/><text class="chart-label" x="0" y="${y + 3}">${formatNumber(min + (max - min) * fraction, 0)}</text>`;
  }).join("");
  const labels = coordinates.map((point, index) => index === 0 || index === coordinates.length - 1 || index === Math.floor(coordinates.length / 2)
    ? `<text class="chart-label" text-anchor="middle" x="${point.x}" y="${height - 3}">${formatDate(captureTimestamp(captures[index]))}</text>` : "").join("");
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Gráfico de altura estimada dos saltos">${grid}<defs><linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#c6f36b" stop-opacity=".23"/><stop offset="100%" stop-color="#c6f36b" stop-opacity="0"/></linearGradient></defs><path class="chart-area" d="${area}"/><path class="chart-line" d="${path}"/>${coordinates.map((point) => `<circle class="chart-point" cx="${point.x}" cy="${point.y}" r="3.5"/>`).join("")}${labels}</svg>`;
}

function renderRecentCapture(capture) {
  const athlete = captureAthlete(capture);
  const height = numeric(capture.alturaEstimadaCm);
  return `<div class="recent-item"><span class="recent-mark">⌁</span><div><div class="recent-name">${escapeHtml(athlete?.nome || "Atleta não identificado")}</div><div class="recent-meta">${formatDate(captureTimestamp(capture), true)} · voo ${formatNumber(capture.tempoVooMs, 0)} ms</div></div><span class="recent-score">${formatNumber(height)} cm</span></div>`;
}

function renderAthleteCard(athlete) {
  const jumps = athleteCaptures(athlete.id);
  return `<a class="athlete-card" href="${pageHref("atleta")}?id=${encodeURIComponent(athlete.id)}" aria-label="Abrir perfil de ${escapeHtml(athlete.nome)}"><div class="athlete-card-top"><span class="athlete-avatar">${escapeHtml(initials(athlete.nome))}</span><div style="min-width:0"><h3 class="athlete-name">${escapeHtml(athlete.nome)}</h3><p class="athlete-meta">${escapeHtml(athlete.alturaCm ?? "—")} cm · ${escapeHtml(athlete.pesoKg ?? "—")} kg</p></div></div><div class="athlete-stats"><span>${jumps.length} saltos</span><strong>${formatNumber(getBestHeight(jumps))} cm · recorde</strong></div></a>`;
}

function renderAthletes() {
  const filtered = state.athletes.filter((athlete) => athlete.nome?.toLocaleLowerCase("pt-BR").includes(state.athleteSearch.toLocaleLowerCase("pt-BR")));
  const actions = `<input class="search-input" type="search" id="athlete-search" placeholder="Buscar atleta..." value="${escapeHtml(state.athleteSearch)}" aria-label="Buscar atleta">${button("new-athlete", "+ Novo atleta", "button primary")}`;
  const rows = filtered.map((athlete) => {
    const sessions = athleteSessions(athlete.id).length;
    const jumps = athleteCaptures(athlete.id);
    return `<tr data-profile-athlete-id="${escapeHtml(athlete.id)}"><td><div class="table-name"><span class="table-avatar">${escapeHtml(initials(athlete.nome))}</span><span><a class="athlete-row-link" href="${pageHref("atleta")}?id=${encodeURIComponent(athlete.id)}"><strong>${escapeHtml(athlete.nome)}</strong></a><span class="table-secondary">ID ${escapeHtml(athlete.id)}</span></span></div></td><td>${formatDate(athlete.dataNascimento)}</td><td>${escapeHtml(athlete.alturaCm ?? "—")} cm</td><td>${escapeHtml(athlete.pesoKg ?? "—")} kg</td><td>${sessions}</td><td>${jumps.length}</td><td><div class="table-actions"><a class="button small ghost" href="${pageHref("atleta")}?id=${encodeURIComponent(athlete.id)}">Perfil</a>${button("edit-athlete", "Editar", "button small ghost", `data-id="${escapeHtml(athlete.id)}"`)}${button("delete-athlete", "Excluir", "button small danger", `data-id="${escapeHtml(athlete.id)}"`)}</div></td></tr>`;
  }).join("");
  return `${sectionHeader("ELENCO", "Atletas", "Gerencie os perfis e acompanhe os indicadores individuais.", actions)}
    <section class="panel">${filtered.length ? `<div class="table-wrap"><table><thead><tr><th>Atleta</th><th>Nascimento</th><th>Altura</th><th>Peso</th><th>Sessões</th><th>Saltos</th><th>Ações</th></tr></thead><tbody>${rows}</tbody></table></div>` : emptyState(state.athletes.length ? "Nenhum resultado" : "Nenhum atleta cadastrado", state.athletes.length ? "Tente outro nome na busca." : "Cadastre atletas para começar a acompanhar o desempenho.", state.athletes.length ? "" : "Cadastrar atleta", state.athletes.length ? "" : "new-athlete")}</section>`;
}

function renderAthleteProfile() {
  const athlete = athleteById(state.selectedAthleteId);
  if (!athlete) {
    if (state.loading) return `<div class="loading">Carregando perfil do atleta...</div>`;
    return `${sectionHeader("PERFIL DO ATLETA", "Atleta não encontrado", "Este perfil não está disponível ou o atleta foi removido.", button("navigate", "Voltar para atletas", "button ghost", `data-view="atletas"`))}`;
  }
  const captures = sortCaptures(athleteCaptures(athlete.id));
  const sessions = athleteSessions(athlete.id).sort((left, right) => new Date(right.dataHoraInicio) - new Date(left.dataHoraInicio));
  const average = getAverageHeight(captures);
  const sessionRows = sessions.map((session) => `<tr class="session-row" data-session-id="${escapeHtml(session.id)}"><td><a class="session-row-link" href="${pageHref("sessao")}?id=${encodeURIComponent(session.id)}"><strong>#${escapeHtml(session.id)}</strong></a></td><td>${formatDate(session.dataHoraInicio, true)}</td><td>${session.dataHoraFim ? formatDate(session.dataHoraFim, true) : "Em andamento"}</td><td>${sessionCaptures(session.id).length}</td><td>${button("edit-session", "Editar", "button small ghost", `data-id="${escapeHtml(session.id)}"`)}</td></tr>`).join("");
  const captureRows = captures.slice(0, 8).map(renderCaptureRow).join("");
  const actions = `${button("edit-athlete", "Editar perfil", "button ghost", `data-id="${escapeHtml(athlete.id)}"`)}${button("new-session", "+ Nova sessão", "button primary", `data-athlete-id="${escapeHtml(athlete.id)}"`)}`;
  return `${sectionHeader("PERFIL DO ATLETA", athlete.nome, "Histórico individual de sessões e dados captados pelo sensor.", actions)}
    <section class="profile-hero"><span class="athlete-avatar">${escapeHtml(initials(athlete.nome))}</span><div class="profile-info"><h2>${escapeHtml(athlete.nome)}</h2><p>Nascimento ${formatDate(athlete.dataNascimento)} · Atleta #${escapeHtml(athlete.id)}</p></div><div class="profile-facts"><div class="profile-fact"><span>Altura</span><strong>${escapeHtml(athlete.alturaCm ?? "—")} cm</strong></div><div class="profile-fact"><span>Peso</span><strong>${escapeHtml(athlete.pesoKg ?? "—")} kg</strong></div></div></section>
    <div class="metrics-grid profile-metrics">${metricCard("Sessões", sessions.length, "sessões", "Treinos registrados", "◷")}${metricCard("Saltos captados", captures.length, "saltos", "Dados enviados pelo ESP32", "⌁")}${metricCard("Melhor marca", formatNumber(getBestHeight(captures)), "cm", "Maior altura estimada", "↗")}${metricCard("Média de altura", formatNumber(average), "cm", "Média das captações", "∿")}</div>
    <div class="section-row"><h2>Sessões do atleta</h2>${button("new-session", "+ Nova sessão", "button small ghost", `data-athlete-id="${escapeHtml(athlete.id)}"`)}</div>
    <section class="panel">${sessions.length ? `<div class="table-wrap"><table><thead><tr><th>Sessão</th><th>Início</th><th>Fim</th><th>Saltos</th><th>Ações</th></tr></thead><tbody>${sessionRows}</tbody></table></div>` : emptyState("Sem sessões registradas", "Crie uma sessão para vincular captações a este atleta.", "Criar sessão", "new-session")}</section>
    <div class="section-row"><h2>Captações recentes</h2><a href="${pageHref("captacoes")}" data-view-link="captacoes">Ver todas ↗</a></div>
    <section class="panel">${captures.length ? `<div class="table-wrap"><table><thead><tr><th>Data e hora</th><th>Sessão</th><th>Tempo de voo</th><th>Altura estimada</th><th>Aceleração Z</th></tr></thead><tbody>${captureRows}</tbody></table></div>` : emptyState("Nenhum dado captado", "As leituras do sensor serão exibidas após o envio pela API.")}</section>`;
}

function renderSessions() {
  const rows = [...state.sessions].sort((a, b) => new Date(b.dataHoraInicio) - new Date(a.dataHoraInicio)).map((session) => {
    const athlete = session.atleta || athleteById(session.atletaId);
    const jumps = sessionCaptures(session.id).length;
    return `<tr class="session-row" data-session-id="${escapeHtml(session.id)}"><td><a class="session-row-link" href="${pageHref("sessao")}?id=${encodeURIComponent(session.id)}"><strong>#${escapeHtml(session.id)}</strong></a></td><td>${escapeHtml(athlete?.nome || "Atleta não identificado")}</td><td>${formatDate(session.dataHoraInicio, true)}</td><td>${session.dataHoraFim ? formatDate(session.dataHoraFim, true) : `<span class="state-badge"><i class="status-dot"></i>Em andamento</span>`}</td><td>${jumps}</td><td>${escapeHtml(session.observacoes || "—")}</td><td><div class="table-actions">${button("edit-session", "Editar", "button small ghost", `data-id="${escapeHtml(session.id)}"`)}${button("delete-session", "Excluir", "button small danger", `data-id="${escapeHtml(session.id)}"`)}</div></td></tr>`;
  }).join("");
  return `${sectionHeader("ROTINA DE TREINO", "Sessões", "Crie e organize os treinos usados para agrupar captações.", button("new-session", "+ Nova sessão", "button primary"))}
    <section class="panel">${state.sessions.length ? `<div class="table-wrap"><table><thead><tr><th>ID</th><th>Atleta</th><th>Início</th><th>Fim</th><th>Saltos</th><th>Observações</th><th>Ações</th></tr></thead><tbody>${rows}</tbody></table></div>` : emptyState("Nenhuma sessão cadastrada", "Crie uma sessão para começar a associar os dados do sensor.", "Criar sessão", "new-session")}</section>`;
}

function renderSessionDashboard() {
  const session = sessionById(state.selectedSessionId);
  if (!session) {
    if (state.loading) return `<div class="loading">Carregando análise da sessão...</div>`;
    return sectionHeader("ANÁLISE DA SESSÃO", "Sessão não encontrada", "Esta sessão não está disponível ou foi removida.", button("navigate", "Voltar para sessões", "button ghost", `data-view="sessoes"`));
  }
  const athlete = session.atleta || athleteById(session.atletaId);
  const captures = sessionCaptures(session.id);
  const averageFlight = captures.length
    ? captures.reduce((total, capture) => total + numeric(capture.tempoVooMs), 0) / captures.length
    : 0;
  const actions = `${athlete ? `<a class="button ghost" href="${pageHref("atleta")}?id=${encodeURIComponent(athlete.id)}">Voltar ao atleta</a>` : ""}${button("edit-session", "Editar sessão", "button ghost", `data-id="${escapeHtml(session.id)}"`)}`;
  return `${sectionHeader("DASHBOARD DA SESSÃO", `Sessão #${session.id}`, `${athlete?.nome ? `${athlete.nome} · ` : ""}${formatDate(session.dataHoraInicio, true)}${session.dataHoraFim ? ` até ${formatDate(session.dataHoraFim, true)}` : " · Em andamento"}`, actions)}
    ${session.observacoes ? `<section class="panel session-notes"><div class="panel-body"><strong>Observações</strong><p>${escapeHtml(session.observacoes)}</p></div></section>` : ""}
    <div class="metrics-grid">
      ${metricCard("Captações", captures.length, "saltos", "Registros desta sessão", "⌁")}
      ${metricCard("Altura média", formatNumber(getAverageHeight(captures)), "cm", "Média das alturas estimadas", "∿")}
      ${metricCard("Melhor salto", formatNumber(getBestHeight(captures)), "cm", "Maior altura estimada", "↗")}
      ${metricCard("Tempo de voo médio", formatNumber(averageFlight, 0), "ms", "Duração média dos saltos", "◷")}
    </div>
    <section class="panel session-chart-panel"><div class="panel-header"><div><h2 class="panel-title">Evolução dos saltos</h2><p class="panel-subtitle">Altura estimada por captação · cm</p></div><span class="capture-badge"><i class="status-dot"></i>${captures.length} registros</span></div>
      <div class="chart-summary"><strong>${formatNumber(getAverageHeight(captures))} cm</strong><span>média da sessão</span></div>
      <div class="chart-wrap">${renderChart(captures.slice().reverse())}</div>
    </section>
    <div class="section-row"><h2>Histórico de captações</h2><span class="capture-badge">${captures.length} registros</span></div>
    <section class="panel">${captures.length ? `<div class="table-wrap"><table><thead><tr><th>Data e hora</th><th>Tempo de voo</th><th>Altura estimada</th><th>Aceleração de pico Z</th></tr></thead><tbody>${captures.map((capture) => `<tr><td>${formatDate(captureTimestamp(capture), true)}</td><td>${formatNumber(capture.tempoVooMs, 0)} ms</td><td><strong>${formatNumber(capture.alturaEstimadaCm)} cm</strong></td><td>${formatNumber(capture.aceleracaoPicoZ, 2)} m/s²</td></tr>`).join("")}</tbody></table></div>` : emptyState("Sem captações nesta sessão", "Os dados enviados pelo sensor durante este treino aparecerão aqui.")}</section>`;
}

function renderCaptureRow(capture) {
  const session = captureSession(capture);
  const athlete = captureAthlete(capture);
  return `<tr><td>${formatDate(captureTimestamp(capture), true)}</td><td>${escapeHtml(athlete?.nome || "—")}</td><td>#${escapeHtml(session?.id ?? capture.sessaoId ?? "—")}</td><td>${formatNumber(capture.tempoVooMs, 0)} ms</td><td><strong>${formatNumber(capture.alturaEstimadaCm)} cm</strong></td><td>${formatNumber(capture.aceleracaoPicoZ, 2)} m/s²</td></tr>`;
}

function renderCaptures() {
  const selected = state.captureSessionFilter;
  const filtered = sortCaptures().filter((capture) => selected === "all" || String(capture.sessao?.id ?? capture.sessaoId) === String(selected));
  const options = `<option value="all">Todas as sessões</option>${state.sessions.map((session) => `<option value="${escapeHtml(session.id)}" ${String(session.id) === selected ? "selected" : ""}>Sessão #${escapeHtml(session.id)} · ${escapeHtml((session.atleta?.nome || athleteById(session.atletaId)?.nome) ?? "Atleta")}</option>`).join("")}`;
  return `${sectionHeader("DADOS DO SENSOR", "Captações", "Leituras enviadas pela ESP32 e armazenadas pela API.", `<select class="select-input" id="capture-session-filter" aria-label="Filtrar por sessão">${options}</select>${button("refresh", "↻ Atualizar", "button ghost")}`)}
    <div class="metrics-grid">${metricCard("Total de registros", filtered.length, "captações", selected === "all" ? "Todas as sessões" : `Sessão #${selected}`, "⌁")}${metricCard("Altura média", formatNumber(getAverageHeight(filtered)), "cm", "Estimativa de altura por tempo de voo", "∿")}${metricCard("Maior altura", formatNumber(getBestHeight(filtered)), "cm", "Melhor marca entre as captações", "↗")}${metricCard("Tempo de voo médio", formatNumber(filtered.length ? filtered.reduce((sum, capture) => sum + numeric(capture.tempoVooMs), 0) / filtered.length : 0, 0), "ms", "Duração média do voo", "◷")}</div>
    <section class="panel"><div class="panel-header"><div><h2 class="panel-title">Registros recebidos</h2><p class="panel-subtitle">Atualização automática a cada 15 segundos</p></div><span class="capture-badge"><i class="status-dot"></i>ESP32</span></div>
      ${filtered.length ? `<div class="table-wrap"><table><thead><tr><th>Data e hora</th><th>Atleta</th><th>Sessão</th><th>Tempo de voo</th><th>Altura estimada</th><th>Aceleração de pico Z</th></tr></thead><tbody>${filtered.map(renderCaptureRow).join("")}</tbody></table></div>` : emptyState("Nenhuma captação encontrada", selected === "all" ? "Quando a ESP32 enviar dados para /api/saltos, os registros aparecerão aqui." : "Não há captações associadas a esta sessão.")}
    </section>`;
}

function openModal(title, description, fields, submitLabel, onSubmit, { danger = false } = {}) {
  modalContent.innerHTML = `<div class="modal-head"><div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p></div><button class="modal-close" type="button" data-action="close-modal" aria-label="Fechar">×</button></div><div class="modal-fields">${fields}</div><div class="modal-actions"><button class="button ghost" type="button" data-action="close-modal">Cancelar</button><button class="button ${danger ? "danger" : "primary"}" type="submit">${escapeHtml(submitLabel)}</button></div>`;
  modalForm.onsubmit = async (event) => {
    event.preventDefault();
    const submitButton = modalForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    try {
      await onSubmit(new FormData(modalForm));
      modal.close();
    } catch (error) {
      toast(apiErrorMessage(error), true);
    } finally {
      submitButton.disabled = false;
    }
  };
  modal.showModal();
}

function openAthleteForm(athlete = null) {
  const editing = Boolean(athlete);
  const today = new Date();
  const localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const fields = `<div class="field full"><label for="athlete-name">Nome completo</label><input id="athlete-name" name="nome" required maxlength="100" autocomplete="name" value="${escapeHtml(athlete?.nome || "")}"></div>
    <div class="field"><label for="athlete-birth">Data de nascimento</label><input id="athlete-birth" name="dataNascimento" type="date" required max="${localToday}" value="${escapeHtml(athlete?.dataNascimento || "")}"></div>
    <div class="field"><label for="athlete-weight">Peso (kg)</label><input id="athlete-weight" name="pesoKg" type="number" min="0.1" step="0.1" required value="${escapeHtml(athlete?.pesoKg ?? "")}"></div>
    <div class="field"><label for="athlete-height">Altura (cm)</label><input id="athlete-height" name="alturaCm" type="number" min="1" step="1" required value="${escapeHtml(athlete?.alturaCm ?? "")}"></div>`;
  openModal(editing ? "Editar atleta" : "Novo atleta", "Os dados serão salvos diretamente na API Ápice.", fields, editing ? "Salvar alterações" : "Cadastrar atleta", async (form) => {
    const data = {
      nome: String(form.get("nome")).trim(),
      dataNascimento: form.get("dataNascimento"),
      pesoKg: Number(form.get("pesoKg")),
      alturaCm: Number(form.get("alturaCm")),
    };
    await apiRequest(editing ? `/api/atletas/${athlete.id}` : "/api/atletas", {
      method: editing ? "PUT" : "POST",
      body: JSON.stringify(data),
    });
    await loadData({ silent: true });
    toast(editing ? "Perfil do atleta atualizado." : "Atleta cadastrado.");
  });
}

function toDateTimeLocal(value) {
  if (!value) return "";
  return String(value).slice(0, 16);
}

function currentDateTimeLocal() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function openSessionForm(session = null, athleteId = null) {
  if (!state.athletes.length) {
    toast("Cadastre um atleta antes de criar uma sessão.", true);
    state.view = "atletas";
    render();
    return;
  }
  const editing = Boolean(session);
  const selectedAthleteId = athleteId ?? session?.atleta?.id ?? session?.atletaId;
  const fields = `<div class="field full"><label for="session-athlete">Atleta</label><select id="session-athlete" name="atletaId" required>${state.athletes.map((athlete) => `<option value="${escapeHtml(athlete.id)}" ${String(athlete.id) === String(selectedAthleteId) ? "selected" : ""}>${escapeHtml(athlete.nome)}</option>`).join("")}</select></div>
    <div class="field"><label for="session-start">Início</label><input id="session-start" name="dataHoraInicio" type="datetime-local" required value="${escapeHtml(toDateTimeLocal(session?.dataHoraInicio) || currentDateTimeLocal())}"></div>
    <div class="field"><label for="session-end">Fim (opcional)</label><input id="session-end" name="dataHoraFim" type="datetime-local" value="${escapeHtml(toDateTimeLocal(session?.dataHoraFim))}"></div>
    <div class="field full"><label for="session-notes">Observações</label><textarea id="session-notes" name="observacoes" maxlength="2000">${escapeHtml(session?.observacoes || "")}</textarea></div>`;
  openModal(editing ? "Editar sessão" : "Nova sessão", "Vincule o treino ao atleta para associar as captações da ESP32.", fields, editing ? "Salvar alterações" : "Criar sessão", async (form) => {
    const data = {
      atletaId: Number(form.get("atletaId")),
      dataHoraInicio: form.get("dataHoraInicio"),
      dataHoraFim: form.get("dataHoraFim") || null,
      observacoes: String(form.get("observacoes") || "").trim(),
    };
    await apiRequest(editing ? `/api/sessoes/${session.id}` : "/api/sessoes", {
      method: editing ? "PUT" : "POST",
      body: JSON.stringify(data),
    });
    await loadData({ silent: true });
    toast(editing ? "Sessão atualizada." : "Sessão criada.");
  });
}

async function confirmDelete(kind, record) {
  const isAthlete = kind === "atleta";
  const title = isAthlete ? "Excluir atleta?" : "Excluir sessão?";
  const name = isAthlete ? record.nome : `sessão #${record.id}`;
  const fields = `<div class="field full"><p class="page-description">Você está prestes a excluir <strong>${escapeHtml(name)}</strong>. Essa ação não pode ser desfeita.${isAthlete ? " Atletas com sessões vinculadas podem ser recusados pela API." : " Sessões com captações vinculadas podem ser recusadas pela API."}</p></div>`;
  openModal(title, "Confirme antes de continuar.", fields, "Excluir", async () => {
    await apiRequest(`/api/${isAthlete ? "atletas" : "sessoes"}/${record.id}`, { method: "DELETE" });
    if (!isAthlete && state.view === "atleta") {
      window.location.href = pageHref("atletas");
      return;
    }
    await loadData({ silent: true });
    toast(isAthlete ? "Atleta excluído." : "Sessão excluída.");
  }, { danger: true });
}

document.addEventListener("click", (event) => {
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) {
    window.location.href = pageHref(viewButton.dataset.view);
    return;
  }
  const link = event.target.closest("[data-view-link]");
  if (link) {
    window.location.href = pageHref(link.dataset.viewLink);
    return;
  }
  const sessionRow = event.target.closest("tr[data-session-id]");
  if (sessionRow && !event.target.closest("button, a, input, select, textarea")) {
    window.location.href = `${pageHref("sessao")}?id=${encodeURIComponent(sessionRow.dataset.sessionId)}`;
    return;
  }
  const athleteRow = event.target.closest("tr[data-profile-athlete-id]");
  if (athleteRow && !event.target.closest("button, a, input, select, textarea")) {
    window.location.href = `${pageHref("atleta")}?id=${encodeURIComponent(athleteRow.dataset.profileAthleteId)}`;
    return;
  }
  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) return;
  const id = actionButton.dataset.id;
  if (actionButton.dataset.action === "refresh") loadData();
  else if (actionButton.dataset.action === "logout") {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    const loginPath = state.view === "inicio" ? "login.html" : "../login.html";
    window.location.replace(loginPath);
  }
  else if (actionButton.dataset.action === "close-modal") modal.close();
  else if (actionButton.dataset.action === "new-athlete") openAthleteForm();
  else if (actionButton.dataset.action === "edit-athlete") openAthleteForm(athleteById(id));
  else if (actionButton.dataset.action === "open-athlete") {
    window.location.href = `${pageHref("atleta")}?id=${encodeURIComponent(id)}`;
  } else if (actionButton.dataset.action === "navigate") {
    window.location.href = pageHref(actionButton.dataset.view);
  } else if (actionButton.dataset.action === "delete-athlete") {
    const athlete = athleteById(id);
    if (athlete) confirmDelete("atleta", athlete);
  } else if (actionButton.dataset.action === "new-session") {
    openSessionForm(null, actionButton.dataset.athleteId || null);
  } else if (actionButton.dataset.action === "edit-session") {
    const session = sessionById(id);
    if (session) openSessionForm(session);
  } else if (actionButton.dataset.action === "delete-session") {
    const session = sessionById(id);
    if (session) confirmDelete("sessao", session);
  }
});

document.addEventListener("input", (event) => {
  if (event.target.id === "athlete-search") {
    state.athleteSearch = event.target.value;
    const cursorPosition = event.target.selectionStart;
    render();
    const search = document.querySelector("#athlete-search");
    search?.focus();
    search?.setSelectionRange(cursorPosition, cursorPosition);
  }
});

document.addEventListener("change", (event) => {
  if (event.target.id === "capture-session-filter") {
    state.captureSessionFilter = event.target.value;
    render();
  }
});

modal.addEventListener("click", (event) => {
  if (event.target === modal) modal.close();
});

if (!state.authToken) {
  const loginPath = state.view === "inicio" ? "login.html" : "../login.html";
  const returnTo = state.view === "inicio"
    ? `index.html${window.location.search}`
    : `pages/${state.view === "atleta" ? "atleta" : state.view}.html${window.location.search}`;
  window.location.replace(`${loginPath}?returnTo=${encodeURIComponent(returnTo)}`);
} else {
  render();
  loadData({ silent: true });
  window.setInterval(() => {
    if (!document.hidden) loadData({ silent: true });
  }, POLL_INTERVAL_MS);
}
