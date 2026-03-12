// background.js - Service Worker da extensão

// Lida com o atalho de teclado para ativar/desativar Web to Picture
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'activate-web-to-picture') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      return;
    }

    // Executa o toggle via content script
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        if (window.__webToPicture_toggle) {
          return window.__webToPicture_toggle(390, 844, false);
        }
      },
    }).catch(console.error);
  }
});

// Ao instalar a extensão, exibe uma notificação de boas-vindas
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Web to Picture instalado com sucesso!');
  }
});
