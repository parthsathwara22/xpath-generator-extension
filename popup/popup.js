/**
 * Popup Script — Toggle selector mode
 */
(function () {
    var toggleBtn = document.getElementById('toggle-btn');
    var toggleText = document.getElementById('toggle-text');
    var toggleIcon = document.getElementById('toggle-icon');
    var isActive = false;

    // Check current status on popup open
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (!tabs[0]) return;
        chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_SELECTOR_MODE_STATUS' }, function (response) {
            if (chrome.runtime.lastError) return;
            if (response && response.active) {
                setActiveUI(true);
            }
        });
    });

    toggleBtn.addEventListener('click', function () {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (!tabs[0]) return;
            chrome.tabs.sendMessage(tabs[0].id, { type: 'TOGGLE_SELECTOR_MODE' }, function (response) {
                if (chrome.runtime.lastError) {
                    toggleText.textContent = 'Error — refresh page';
                    return;
                }
                if (response) {
                    setActiveUI(response.active);
                }
            });
        });
    });

    function setActiveUI(active) {
        isActive = active;
        if (active) {
            toggleBtn.classList.add('active');
            toggleText.textContent = 'Selector Mode Active';
            toggleIcon.textContent = '✅';
        } else {
            toggleBtn.classList.remove('active');
            toggleText.textContent = 'Enable Selector Mode';
            toggleIcon.textContent = '🎯';
        }
    }
})();
