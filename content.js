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

    // Navega a própria janela PiP para a URL — carrega como top-level,
    // sem restrições de iframe (X-Frame-Options / CSP frame-ancestors).
    // Não usamos document.write() pois herda o CSP da página atual e bloqueia.
    pipWindow.location.href = currentUrl;

    // Monitora fechamento real da janela via polling
    const checkClosed = setInterval(() => {
      if (!pipWindow || pipWindow.closed) {
        isActive = false;
        pipWindow = null;
        clearInterval(checkClosed);
      }
    }, 500);
  }

  function closePip() {
    if (pipWindow && !pipWindow.closed) {
      pipWindow.close();
    }
    isActive = false;
    pipWindow = null;
  }

})();
