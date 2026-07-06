console.log("🚀 Popup carregado");
console.log("Utils:", window.Utils);
// ===== Estado e persistência =====
const STORAGE_KEY = "organizadorGrupos";

const defaultState = {
  groups: [],        // { id, name, url, lastPosted: timestamp|null }
  currentIndex: 0,
  shareLink: "",
  fixedDescription: "",
  settings: {
    cooldownMinutes: 3,
    duplicateWindowHours: 24,
    autoProgress: true,
    autoOpenEditor: true
  }
};

let state = structuredClone(defaultState);
let cooldownInterval = null;
let cooldownEndsAt = null;

function loadState() {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      if (result[STORAGE_KEY]) {
        state = Object.assign(structuredClone(defaultState), result[STORAGE_KEY]);
        state.settings = Object.assign(structuredClone(defaultState.settings), state.settings || {});
      }
      resolve();
    });
  });
}

function saveState() {
  chrome.storage.local.set({ [STORAGE_KEY]: state });
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ===== Tabs =====
function setupTabs() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
    });
  });
}

// ===== Parsing da lista colada =====
function parsePastedLinks(text) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const parsed = [];
  for (const line of lines) {
    let name, url;
    if (line.includes("|")) {
      const parts = line.split("|");
      name = parts[0].trim();
      url = parts.slice(1).join("|").trim();
    } else {
      url = line.trim();
      name = null;
    }
    // valida se parece uma URL
    if (!/^https?:\/\//i.test(url)) continue;
    parsed.push({ name, url });
  }
  return parsed;
}

function addLinksToState(parsedLinks) {
  const existingUrls = new Set(state.groups.map((g) => normalizeUrl(g.url)));
  let added = 0;
  let duplicatesSkipped = 0;

  parsedLinks.forEach((item, idx) => {
    const norm = normalizeUrl(item.url);
    if (existingUrls.has(norm)) {
      duplicatesSkipped++;
      return;
    }
    existingUrls.add(norm);
    state.groups.push({
      id: uid(),
      name: item.name || `Grupo ${state.groups.length + 1}`,
      url: item.url,
      lastPosted: null
    });
    added++;
  });

  saveState();
  return { added, duplicatesSkipped };
}

function normalizeUrl(url) {
  return url.trim().replace(/\/+$/, "").toLowerCase();
}
// ===== Renderização: Lista =====
function renderGroupList() {
  const ul = document.getElementById("groupList");
  ul.innerHTML = "";
  document.getElementById("listCount").textContent = `${state.groups.length} grupos cadastrados`;

  state.groups.forEach((g, index) => {
    const li = document.createElement("li");
    if (g.lastPosted) li.classList.add("posted");

    const info = document.createElement("div");
    info.className = "group-item-info";

    const name = document.createElement("div");
    name.className = "group-item-name";
    name.textContent = `${index + 1}. ${g.name}`;

    const status = document.createElement("div");
    status.className = "group-item-status";
    status.textContent = g.lastPosted
      ? `Postado ${timeAgo(g.lastPosted)}`
      : "Ainda não postado";

    info.appendChild(name);
    info.appendChild(status);

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-btn";
    removeBtn.textContent = "✕";
    removeBtn.title = "Remover grupo";
    removeBtn.addEventListener("click", () => {
      state.groups.splice(index, 1);
      if (state.currentIndex > index) state.currentIndex--;
      saveState();
      renderAll();
    });

    li.appendChild(info);
    li.appendChild(removeBtn);
    ul.appendChild(li);
  });
}

function timeAgo(timestamp) {
  const diffMs = Date.now() - timestamp;
  const diffH = diffMs / (1000 * 60 * 60);
  if (diffH < 1) return `há ${Math.round(diffH * 60)}min`;
  if (diffH < 24) return `há ${Math.round(diffH)}h`;
  return `há ${Math.round(diffH / 24)}d`;
}

// ===== Renderização: Aba Postar =====
function renderPostarTab() {
  const total = state.groups.length;
  const postadosHoje = state.groups.filter((g) => g.lastPosted && isToday(g.lastPosted)).length;
  const restantes = state.groups.filter((g) => !g.lastPosted).length;

  document.getElementById("statPostadosHoje").textContent = postadosHoje;
  document.getElementById("statRestantes").textContent = restantes;
  document.getElementById("statTotal").textContent = total;

  const emptyState = document.getElementById("emptyState");
  const card = document.getElementById("currentGroupCard");
  const finished = document.getElementById("finishedState");

  if (total === 0) {
    emptyState.classList.remove("hidden");
    card.classList.add("hidden");
    finished.classList.add("hidden");
    return;
  }
  emptyState.classList.add("hidden");

  if (state.currentIndex >= total) {
    finished.classList.remove("hidden");
    card.classList.add("hidden");
    return;
  }
  finished.classList.add("hidden");
  card.classList.remove("hidden");

  const group = state.groups[state.currentIndex];
  document.getElementById("progressIndex").textContent = state.currentIndex + 1;
  document.getElementById("progressTotal").textContent = total;
  document.getElementById("currentGroupName").textContent = group.name;
  document.getElementById("currentGroupUrl").textContent = group.url;

  const warningBox = document.getElementById("duplicateWarning");
  if (group.lastPosted) {
    const hoursSince = (Date.now() - group.lastPosted) / (1000 * 60 * 60);
    if (hoursSince < state.settings.duplicateWindowHours) {
      document.getElementById("duplicateHours").textContent = Math.round(hoursSince);
      warningBox.classList.remove("hidden");
    } else {
      warningBox.classList.add("hidden");
    }
  } else {
    warningBox.classList.add("hidden");
  }
}

function isToday(timestamp) {
  const d = new Date(timestamp);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function markCurrentAsPosted() {
    const group = state.groups[state.currentIndex];
    if (!group) return;
    group.lastPosted = Date.now();
    state.currentIndex++;
    saveState();
    clearInterval(cooldownInterval);
    document.getElementById("cooldownTimer").classList.add("hidden");
    renderAll();

    // Se estiver no automático, fecha a aba e abre o próximo
    if (state.settings.autoProgress)
    {
        if (currentGroupTabId)
        {
            chrome.tabs.remove(currentGroupTabId);
            currentGroupTabId = null;
        }

        const nextGroup = state.groups[state.currentIndex];
        if (nextGroup)
        {
            // Delay curto pra não ser bloqueado pelo FB por rapidez excessiva
            setTimeout(() => {
                openGroup(nextGroup);
            }, 2000);
        }
    }
}

// ===== Cooldown =====
function startCooldown() {
  const minutes = Number(state.settings.cooldownMinutes) || 0;
  const btnMarcar = document.getElementById("btnMarcarPostado");
  const timerBox = document.getElementById("cooldownTimer");

  if (minutes <= 0) {
    btnMarcar.disabled = false;
    timerBox.classList.add("hidden");
    return;
  }

  cooldownEndsAt = Date.now() + minutes * 60 * 1000;
  btnMarcar.disabled = true;
  timerBox.classList.remove("hidden");

  clearInterval(cooldownInterval);
  cooldownInterval = setInterval(() => {
    const remaining = Math.max(0, Math.ceil((cooldownEndsAt - Date.now()) / 1000));
    document.getElementById("cooldownSeconds").textContent = remaining;
    if (remaining <= 0) {
      clearInterval(cooldownInterval);
      btnMarcar.disabled = false;
      timerBox.classList.add("hidden");
    }
  }, 250);
}

// ===== Link a compartilhar =====
function setupShareLink() {
  const input = document.getElementById("shareLinkInput");
  const descInput = document.getElementById("fixedDescriptionInput");

  input.value = state.shareLink || "";
  descInput.value = state.fixedDescription || "";

  input.addEventListener("input", () => {
    state.shareLink = input.value;
    saveState();
  });

  descInput.addEventListener("input", () => {
    state.fixedDescription = descInput.value;
    saveState();
  });

  document.getElementById("btnCopiarLink").addEventListener("click", async () => {
    const value = input.value.trim();
    if (!value) {
      alert("Cole primeiro o link da publicação que você quer compartilhar.");
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      const msg = document.getElementById("copiedMsg");
      msg.classList.remove("hidden");
      setTimeout(() => msg.classList.add("hidden"), 2500);
    } catch (e) {
      alert("Não consegui copiar automaticamente. Selecione o texto e copie manualmente (Ctrl+C).");
    }
  });
}

// Abre uma URL garantidamente numa janela normal do navegador (com abas),
// nunca dentro da janela "popup" da própria extensão (que não tem barra de abas).
async function openUrlInNormalWindow(url) {
  try {
    const windows = await chrome.windows.getAll({ windowTypes: ["normal"] });
    if (windows.length > 0) {
      const targetWindow = windows[0];
      await chrome.tabs.create({ url, windowId: targetWindow.id });
      try {
        await chrome.windows.update(targetWindow.id, { focused: true });
      } catch (e) {
        console.warn("Could not focus window (might be dragging a tab):", e);
      }
    } else {
      // Não há nenhuma janela normal aberta ainda, cria uma.
      await chrome.windows.create({ url, type: "normal" });
    }
  } catch (e) {
    // Fallback simples caso algo dê errado com a checagem de janelas.
    chrome.tabs.create({ url });
  }
}
let currentGroupTabId = null;

async function openGroup(group)
{
    await openUrlInNormalWindow(group.url);

    const tab = await Utils.waitForFacebookTab(group.url);
    currentGroupTabId = tab.id;

    await Utils.waitForContent(tab);

    try
    {
        let editorOpen = false;

        // Tenta abrir automaticamente SE a opção estiver ligada
        if (state.settings.autoOpenEditor)
        {
            console.log("📤 Enviando OPEN_EDITOR...");
            const openResult = await Utils.sendCommand(tab, "OPEN_EDITOR");
            editorOpen = openResult?.success;
        }

        if (!editorOpen)
        {
            console.log("⚠️ Aguardando abertura manual do modal...");
            const waitResult = await Utils.sendCommand(tab, "WAIT_FOR_MODAL", { timeout: 60 });
            editorOpen = waitResult?.success;
        }

        if (!editorOpen)
        {
            console.log("❌ Editor não foi aberto a tempo.");
            return tab;
        }

        // Se o editor abriu, automatiza o texto e o preview
        if (state.shareLink)
        {
            console.log("📤 Enviando link...");
            const insertResult = await Utils.sendCommand(tab, "INSERT_TEXT", { text: state.shareLink });

            if (insertResult?.success) {
                console.log("📤 Aguardando preview...");
                const previewResult = await Utils.sendCommand(tab, "WAIT_FOR_PREVIEW");

                // Se temos descrição ou se o usuário quer apenas o preview, limpamos o link
                // (O usuário disse: "no lugar disso é possivel depois que colar dar um tempo e apagar o link que foi colado?")
                if (previewResult?.success || true) // limpamos de qualquer forma após o timeout/sucesso
                {
                    console.log("📤 Limpando link...");
                    await Utils.sendCommand(tab, "CLEAR_TEXT");

                    if (state.fixedDescription)
                    {
                        console.log("📤 Inserindo descrição...");
                        await Utils.sendCommand(tab, "INSERT_TEXT", { text: state.fixedDescription });
                    }

                    // Aguarda postagem e avança
                    if (state.settings.autoProgress)
                    {
                        const postResult = await Utils.sendCommand(tab, "WAIT_FOR_POST_SUCCESS", { timeout: 45 });
                        if (postResult?.success)
                        {
                            console.log("🚀 Postagem confirmada! Avançando...");
                            markCurrentAsPosted();
                        }
                    }
                }
            }
        }
    }
    catch (error)
    {
        console.error("❌ Erro ao enviar:", error);
    }

    return tab;
}
// ===== Ações da aba Postar =====
function setupPostarActions() {
  document.getElementById("btnAbrirGrupo").addEventListener("click", async () => {

    console.log("1");

    const group = state.groups[state.currentIndex];

    console.log("2", group);

    const tab = await openGroup(group);

    console.log("3", tab);

    startCooldown();

    console.log("4");

});

  document.getElementById("btnMarcarPostado").addEventListener("click", () => {
    markCurrentAsPosted();
  });

  document.getElementById("btnRemoverAtual").addEventListener("click", () => {
    if (!confirm("Remover este grupo da sua lista permanentemente?")) return;
    state.groups.splice(state.currentIndex, 1);
    saveState();
    clearInterval(cooldownInterval);
    document.getElementById("cooldownTimer").classList.add("hidden");
    renderAll();
  });

  document.getElementById("btnPular").addEventListener("click", () => {
    state.currentIndex++;
    saveState();
    clearInterval(cooldownInterval);
    document.getElementById("cooldownTimer").classList.add("hidden");
    renderAll();
  });

  document.getElementById("btnReiniciarFila").addEventListener("click", () => {
    state.currentIndex = 0;
    saveState();
    renderAll();
  });
}

// ===== Ações da aba Lista =====
function setupListaActions() {
  document.getElementById("btnAdicionarLinks").addEventListener("click", () => {
    const textarea = document.getElementById("inputLinks");
    const parsed = parsePastedLinks(textarea.value);
    if (parsed.length === 0) {
      alert("Nenhum link válido encontrado. Use um link por linha.");
      return;
    }
    const { added, duplicatesSkipped } = addLinksToState(parsed);
    textarea.value = "";
    renderAll();
    let msg = `${added} grupo(s) adicionado(s).`;
    if (duplicatesSkipped > 0) msg += ` ${duplicatesSkipped} link(s) duplicado(s) foram ignorados.`;
    alert(msg);
  });

  document.getElementById("btnLimparTudo").addEventListener("click", () => {
    if (!confirm("Tem certeza que quer apagar TODA a lista e o histórico? Essa ação não pode ser desfeita.")) return;
    state = structuredClone(defaultState);
    saveState();
    renderAll();
  });

  document.getElementById("btnExportar").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    chrome.downloads
      ? chrome.downloads.download({ url, filename: "backup-grupos.json" })
      : downloadFallback(url);
  });

  document.getElementById("btnImportar").addEventListener("click", () => {
    document.getElementById("fileImportar").click();
  });

  document.getElementById("fileImportar").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result);
        if (!imported.groups) throw new Error("Formato inválido");
        state = Object.assign(structuredClone(defaultState), imported);
        saveState();
        renderAll();
        alert("Backup importado com sucesso!");
      } catch (err) {
        alert("Erro ao importar arquivo: " + err.message);
      }
    };
    reader.readAsText(file);
  });
}

function downloadFallback(url) {
  const a = document.createElement("a");
  a.href = url;
  a.download = "backup-grupos.json";
  a.click();
}

// ===== Ações da aba Config =====
function setupConfigActions() {
  document.getElementById("cooldownMinutes").value = state.settings.cooldownMinutes;
  document.getElementById("duplicateWindow").value = state.settings.duplicateWindowHours;
  document.getElementById("autoProgress").checked = !!state.settings.autoProgress;
  document.getElementById("autoOpenEditor").checked = !!state.settings.autoOpenEditor;

  document.getElementById("btnSalvarConfig").addEventListener("click", () => {
    const cooldown = parseFloat(document.getElementById("cooldownMinutes").value);
    const dupWindow = parseFloat(document.getElementById("duplicateWindow").value);
    const autoProgress = document.getElementById("autoProgress").checked;
    const autoOpenEditor = document.getElementById("autoOpenEditor").checked;

    state.settings.cooldownMinutes = isNaN(cooldown) ? 3 : cooldown;
    state.settings.duplicateWindowHours = isNaN(dupWindow) ? 24 : dupWindow;
    state.settings.autoProgress = autoProgress;
    state.settings.autoOpenEditor = autoOpenEditor;

    saveState();
    const savedMsg = document.getElementById("configSaved");
    savedMsg.classList.remove("hidden");
    setTimeout(() => savedMsg.classList.add("hidden"), 1500);
  });
}

// ===== Render geral =====
function renderAll() {
  renderPostarTab();
  renderGroupList();
}

// ===== Init =====
async function init() {
  await loadState();
  setupTabs();
  setupShareLink();
  setupPostarActions();
  setupListaActions();
  setupConfigActions();
  renderAll();
}

init();
