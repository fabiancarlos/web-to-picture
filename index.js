/*
 * Web to Picture - Chrome Extension
 * ------------------------------------
 * Este arquivo é apenas um ponto de entrada simbólico.
 * A lógica da extensão está distribuída nos arquivos:
 *
 *  manifest.json  - Configuração da extensão (Manifest V3)
 *  popup.html     - Interface do ícone na barra do Chrome
 *  popup.js       - Lógica do popup (preset de tamanho, botão ativar)
 *  content.js     - Script injetado nas páginas (abre a janela PiP)
 *  background.js  - Service Worker (atalho de teclado Alt+Shift+P)
 *  icons/         - Ícones PNG (16, 48, 128px)
 *
 * Como instalar no Chrome:
 *  1. Abra chrome://extensions
 *  2. Ative o "Modo do desenvolvedor" (canto superior direito)
 *  3. Clique em "Carregar sem compactação"
 *  4. Selecione esta pasta (web-to-picture/)
 *
 * Uso:
 *  - Clique no ícone da extensão enquanto estiver em qualquer página
 *  - Selecione um preset de tamanho (iPhone, Android, Tablet) ou personalize
 *  - Clique em "Abrir Web to Picture"
 *  - A página abrirá em uma janela flutuante sobre todas as outras janelas
 *  - Use o atalho Alt+Shift+P para ativar/desativar rapidamente
 */
