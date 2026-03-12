// popup.js - Lógica do popup da extensão

let currentTab = null;
let isActive = false;
let reopenDebugInterval = null;

const btnActivate = document.getElementById('btnActivate');
const statusMsg = document.getElementById('statusMsg');
const reopenDebug = document.getElementById('reopenDebug');
const currentUrlEl = document.getElementById('currentUrl');
const pipWidthInput = document.getElementById('pipWidth');
const pipHeightInput = document.getElementById('pipHeight');
const sizeBtns = document.querySelectorAll('.size-btn');

// Obtém a aba atual e exibe a URL
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs && tabs[0]) {
    currentTab = tabs[0];
    const url = new URL(tabs[0].url);
    currentUrlEl.textContent = url.hostname + url.pathname.slice(0, 30);

    // Verifica se o Web to Picture já está ativo nessa aba
    chrome.tabs.sendMessage(tabs[0].id, { action: 'getStatus' }, (response) => {
      if (chrome.runtime.lastError) return;
      if (response && response.active) {
        setActiveState(true);
      }
    });

    startReopenDebugPolling();

    // Desabilita para páginas especiais do Chrome
    if (tabs[0].url.startsWith('chrome://') || tabs[0].url.startsWith('chrome-extension://')) {
      btnActivate.disabled = true;
      statusMsg.textContent = 'Não disponível nesta página.';
    }
  }
});

// Presets de tamanho
sizeBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    sizeBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    pipWidthInput.value = btn.dataset.w;
    pipHeightInput.value = btn.dataset.h;
  });
});

// Deseleciona preset ao editar manualmente
[pipWidthInput, pipHeightInput].forEach((input) => {
  input.addEventListener('input', () => {
    sizeBtns.forEach((b) => b.classList.remove('active'));
  });
});

// Botão principal
btnActivate.addEventListener('click', async () => {
  if (!currentTab) return;

  const width = parseInt(pipWidthInput.value) || 390;
  const height = parseInt(pipHeightInput.value) || 844;

  statusMsg.textContent = '';
  btnActivate.disabled = true;

  try {
    // Injeta o content script e solicita ativação
    await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: injectWebToPicture,
      args: [width, height, isActive],
    });

    if (!isActive) {
      setActiveState(true);
    } else {
      setActiveState(false);
    }
  } catch (err) {
    statusMsg.textContent = 'Erro: ' + (err.message || 'Falha ao ativar.');
    console.error(err);
  } finally {
    btnActivate.disabled = false;
  }

  // Fecha o popup após ativação
  setTimeout(() => window.close(), 300);
});

window.addEventListener('beforeunload', () => {
  if (reopenDebugInterval) {
    clearInterval(reopenDebugInterval);
    reopenDebugInterval = null;
  }
});

function setActiveState(active) {
  isActive = active;
  if (active) {
    btnActivate.classList.add('active');
    btnActivate.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <line x1="18" y1="6" x2="6" y2="18" stroke="white" stroke-width="2" stroke-linecap="round"/>
        <line x1="6" y1="6" x2="18" y2="18" stroke="white" stroke-width="2" stroke-linecap="round"/>
      </svg>
      Fechar Web to Picture
    `;
  } else {
    btnActivate.classList.remove('active');
    btnActivate.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="3" width="20" height="14" rx="2" stroke="white" stroke-width="2"/>
        <rect x="12" y="10" width="9" height="6" rx="1" fill="white"/>
      </svg>
      Abrir Web to Picture
    `;
  }
}

function startReopenDebugPolling() {
  if (!currentTab?.id) {
    return;
  }

  refreshReopenDebug();

  if (reopenDebugInterval) {
    clearInterval(reopenDebugInterval);
  }

  reopenDebugInterval = setInterval(refreshReopenDebug, 500);
}

async function refreshReopenDebug() {
  if (!currentTab?.id) {
    return;
  }

  const key = `webToPicture:tab:${currentTab.id}`;
  const result = await chrome.storage.session.get(key);
  const state = result[key];
  const debug = state?.reopenStatus;

  if (!debug || debug.state === 'idle') {
    reopenDebug.textContent = '';
    reopenDebug.classList.remove('failed', 'success');
    return;
  }

  if (debug.state === 'retrying') {
    const attempt = debug.attempt || 0;
    const maxAttempts = debug.maxAttempts || 6;
    reopenDebug.textContent = `Reabrindo... tentativa ${attempt}/${maxAttempts}`;
    reopenDebug.classList.remove('failed', 'success');
    return;
  }

  if (debug.state === 'failed') {
    reopenDebug.textContent = debug.message || 'Falha ao reabrir automaticamente.';
    reopenDebug.classList.add('failed');
    reopenDebug.classList.remove('success');
    return;
  }

  if (debug.state === 'success') {
    reopenDebug.textContent = debug.message || 'Reaberto com sucesso.';
    reopenDebug.classList.add('success');
    reopenDebug.classList.remove('failed');
  }
}

// Função executada diretamente na aba (world: MAIN para user gesture)
function injectWebToPicture(width, height, shouldClose) {
  return window.__webToPicture_toggle(width, height, shouldClose);
}
