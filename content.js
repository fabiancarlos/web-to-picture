// content.js - Script injetado em todas as páginas
// Registra a função global que o popup chama via executeScript

(function () {
  'use strict';

  let pipWindow = null;
  let isActive = false;

  // Expõe a função de toggle para o popup.js via executeScript
  window.__webToPicture_toggle = async function (width, height, shouldClose) {
    if (shouldClose || (isActive && pipWindow && !pipWindow.closed)) {
      closePip();
      return { closed: true };
    }

    try {
      await openPip(width, height);
      return { opened: true };
    } catch (err) {
      return { error: err.message };
    }
  };

  // Responde a mensagens de status
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.action === 'getStatus') {
      sendResponse({ active: isActive && !!pipWindow && !pipWindow.closed });
    }
    if (msg.action === 'activate') {
      openPip(msg.width || 390, msg.height || 844)
        .then(() => sendResponse({ ok: true }))
        .catch((e) => sendResponse({ error: e.message }));
      return true; // async response
    }
  });

  async function openPip(width, height) {
    if (!('documentPictureInPicture' in window)) {
      throw new Error(
        'Document Picture-in-Picture não é suportado neste navegador. Use Chrome 116+.'
      );
    }

    // Fecha janela anterior se existir
    if (pipWindow && !pipWindow.closed) {
      pipWindow.close();
    }

    const currentUrl = window.location.href;

    // Abre a janela flutuante PiP
    pipWindow = await documentPictureInPicture.requestWindow({
      width: width,
      height: height,
      disallowReturnToOpener: false,
    });

    isActive = true;

    // Constrói o DOM via createElement (sem document.write / sem scripts inline)
    // Isso evita violações de CSP da página pai, que bloqueia 'unsafe-inline'.
    buildPipDom(pipWindow, currentUrl);

    // Fecha quando a janela PiP for fechada pelo usuário
    pipWindow.addEventListener('pagehide', () => {
      isActive = false;
      pipWindow = null;
    });
  }

  function buildPipDom(win, url) {
    const doc = win.document;

    const meta = doc.createElement('meta');
    meta.setAttribute('charset', 'UTF-8');
    doc.head.appendChild(meta);

    const metaVP = doc.createElement('meta');
    metaVP.setAttribute('name', 'viewport');
    metaVP.setAttribute('content', 'width=device-width, initial-scale=1.0');
    doc.head.appendChild(metaVP);

    doc.title = 'Web to Picture';

    // <style> — não afetado por script-src CSP
    const style = doc.createElement('style');
    style.textContent = `
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html, body { width: 100%; height: 100%; background: #111; overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      #toolbar {
        display: flex; align-items: center; height: 36px;
        background: #1a1a1a; border-bottom: 1px solid #2a2a2a;
        padding: 0 6px; gap: 6px; flex-shrink: 0;
      }
      #urlBar {
        flex: 1; background: #111; border: 1px solid #2a2a2a; border-radius: 5px;
        color: #ccc; font-size: 10px; padding: 3px 7px; outline: none;
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }
      .tb-btn {
        background: none; border: none; cursor: pointer; padding: 4px;
        border-radius: 4px; display: flex; align-items: center; justify-content: center;
        color: #888; flex-shrink: 0; transition: background 0.1s, color 0.1s;
      }
      .tb-btn:hover { background: #2a2a2a; color: #fff; }
      .tb-btn.close-btn:hover { background: #dc2626; color: #fff; }
      #container { position: relative; width: 100%; height: calc(100% - 36px); overflow: hidden; }
      #pageFrame { width: 100%; height: 100%; border: none; display: block; background: #fff; }
      #blocked {
        display: none; flex-direction: column; align-items: center; justify-content: center;
        height: 100%; padding: 24px; text-align: center; color: #aaa; gap: 12px;
      }
      #blocked h2 { font-size: 14px; color: #ddd; font-weight: 600; }
      #blocked p { font-size: 12px; line-height: 1.6; }
      .open-btn {
        margin-top: 4px; padding: 8px 16px; background: #2563eb;
        border: none; border-radius: 6px; color: #fff; font-size: 12px;
        cursor: pointer; font-weight: 600;
      }
      .open-btn:hover { background: #1d4ed8; }
      #loading {
        position: absolute; inset: 0; background: #111;
        display: flex; align-items: center; justify-content: center; z-index: 10;
      }
      .spinner {
        width: 28px; height: 28px; border: 3px solid #2a2a2a;
        border-top-color: #2563eb; border-radius: 50%;
        animation: spin 0.7s linear infinite;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
    `;
    doc.head.appendChild(style);

    // ── Toolbar ──
    const toolbar = doc.createElement('div');
    toolbar.id = 'toolbar';

    const favicon = doc.createElement('img');
    favicon.style.cssText = 'width:14px;height:14px;border-radius:2px;flex-shrink:0;';
    try { favicon.src = new URL(url).origin + '/favicon.ico'; } catch(e) {}
    favicon.addEventListener('error', () => { favicon.style.display = 'none'; });
    toolbar.appendChild(favicon);

    const urlBar = doc.createElement('input');
    urlBar.id = 'urlBar';
    urlBar.type = 'text';
    urlBar.readOnly = true;
    urlBar.value = url;
    urlBar.title = url;
    toolbar.appendChild(urlBar);

    const btnRefresh = doc.createElement('button');
    btnRefresh.className = 'tb-btn';
    btnRefresh.title = 'Recarregar';
    btnRefresh.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`;
    toolbar.appendChild(btnRefresh);

    const btnExternal = doc.createElement('button');
    btnExternal.className = 'tb-btn';
    btnExternal.title = 'Abrir no Chrome';
    btnExternal.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;
    toolbar.appendChild(btnExternal);

    const btnClose = doc.createElement('button');
    btnClose.className = 'tb-btn close-btn';
    btnClose.title = 'Fechar';
    btnClose.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    toolbar.appendChild(btnClose);

    doc.body.appendChild(toolbar);

    // ── Container com iframe ──
    const container = doc.createElement('div');
    container.id = 'container';

    const loading = doc.createElement('div');
    loading.id = 'loading';
    const spinner = doc.createElement('div');
    spinner.className = 'spinner';
    loading.appendChild(spinner);
    container.appendChild(loading);

    const frame = doc.createElement('iframe');
    frame.id = 'pageFrame';
    frame.src = url;
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation');
    container.appendChild(frame);

    const blocked = doc.createElement('div');
    blocked.id = 'blocked';
    const blockedIcon = doc.createElement('div');
    blockedIcon.innerHTML = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="1.5" style="opacity:.4"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`;
    const blockedTitle = doc.createElement('h2');
    blockedTitle.textContent = 'Esta página bloqueou o carregamento';
    const blockedText = doc.createElement('p');
    blockedText.textContent = 'O site não permite exibição em janelas incorporadas.';
    const openBlockedBtn = doc.createElement('button');
    openBlockedBtn.className = 'open-btn';
    openBlockedBtn.textContent = 'Abrir no Chrome';
    blocked.appendChild(blockedIcon);
    blocked.appendChild(blockedTitle);
    blocked.appendChild(blockedText);
    blocked.appendChild(openBlockedBtn);
    container.appendChild(blocked);

    doc.body.appendChild(container);

    // ── Event listeners (sem inline handlers — sem violação de CSP) ──
    let loadTimer = null;

    const showBlocked = () => {
      loading.style.display = 'none';
      frame.style.display = 'none';
      blocked.style.display = 'flex';
    };

    frame.addEventListener('load', () => {
      clearTimeout(loadTimer);
      loading.style.display = 'none';
      try {
        const loc = frame.contentWindow.location.href;
        if (!loc || loc === 'about:blank') showBlocked();
      } catch (_) {
        // cross-origin — assumimos carregado com sucesso
      }
    });

    frame.addEventListener('error', () => {
      clearTimeout(loadTimer);
      showBlocked();
    });

    loadTimer = win.setTimeout(() => {
      try {
        if (!frame.contentDocument || !frame.contentDocument.body ||
            frame.contentDocument.body.innerHTML === '') showBlocked();
      } catch (_) {
        loading.style.display = 'none';
      }
    }, 8000);

    btnRefresh.addEventListener('click', () => {
      blocked.style.display = 'none';
      frame.style.display = 'block';
      loading.style.display = 'flex';
      clearTimeout(loadTimer);
      loadTimer = win.setTimeout(() => { loading.style.display = 'none'; }, 8000);
      frame.src = url;
    });

    btnClose.addEventListener('click', () => win.close());

    const openInChrome = () => win.open(url, '_blank');
    btnExternal.addEventListener('click', openInChrome);
    openBlockedBtn.addEventListener('click', openInChrome);
  }

  function closePip() {
    if (pipWindow && !pipWindow.closed) {
      pipWindow.close();
    }
    isActive = false;
    pipWindow = null;
  }

})();
