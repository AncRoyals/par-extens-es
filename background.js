// Abre a extensão como uma nova aba no navegador, em vez de uma janela popup separada.

let organizerTabId = null;

chrome.action.onClicked.addListener(async () => {
  if (organizerTabId !== null) {
    try {
      const tab = await chrome.tabs.get(organizerTabId);
      await chrome.tabs.update(organizerTabId, { active: true });
      await chrome.windows.update(tab.windowId, { focused: true });
      return;
    } catch (e) {
      // A aba não existe mais (foi fechada), segue pra criar uma nova.
      organizerTabId = null;
    }
  }

  const tab = await chrome.tabs.create({
    url: chrome.runtime.getURL("ui/popup.html")
  });
  organizerTabId = tab.id;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === organizerTabId) {
    organizerTabId = null;
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "CLOSE_TAB" && sender.tab) {
        chrome.tabs.remove(sender.tab.id);
    }
});
