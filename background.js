// Abre a extensão como uma janela separada e fixa (não fecha ao trocar de aba),
// em vez do balão padrão que some quando você clica em outro lugar.

let organizerWindowId = null;

chrome.action.onClicked.addListener(async () => {
  if (organizerWindowId !== null) {
    try {
      await chrome.windows.update(organizerWindowId, { focused: true });
      return;
    } catch (e) {
      // A janela não existe mais (foi fechada), segue pra criar uma nova.
      organizerWindowId = null;
    }
  }

  const win = await chrome.windows.create({
    url: chrome.runtime.getURL("ui/popup.html"),
    type: "popup",
    width: 420,
    height: 660
  });
  organizerWindowId = win.id;
});

chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === organizerWindowId) {
    organizerWindowId = null;
  }
});
