/**
 * Service Worker — Background script
 * Handles keyboard shortcut command and relays toggle to content scripts.
 */

// Handle keyboard shortcut (Alt+Shift+X)
chrome.commands.onCommand.addListener(function (command) {
    if (command === 'toggle-selector') {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (!tabs[0]) return;
            chrome.tabs.sendMessage(tabs[0].id, { type: 'TOGGLE_SELECTOR_MODE' });
        });
    }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.type === 'SELECTOR_MODE_CHANGED') {
        // Update badge to show active state
        if (message.active) {
            chrome.action.setBadgeText({ text: 'ON', tabId: sender.tab.id });
            chrome.action.setBadgeBackgroundColor({ color: '#22c55e', tabId: sender.tab.id });
        } else {
            chrome.action.setBadgeText({ text: '', tabId: sender.tab.id });
        }
    }
    return true;
});
