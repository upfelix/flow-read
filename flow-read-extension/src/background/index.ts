chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_READER' }).catch((err) => {
      console.warn('Could not send message to content script. It might not be loaded yet.', err);
      // Optional: Inject script if not present (but manifest handles basic injection)
    });
  }
});
