/**
 * Content Script — Main Orchestrator
 * Handles selector mode, hover highlight, click capture,
 * XPath generation, overlay display, and Escape key.
 */

window.SXG = window.SXG || {};

(function () {
    var selectorModeActive = false;

    function onMouseOver(e) {
        if (!selectorModeActive) return;
        if (SXG.isOverlayElement(e.target)) return;
        if (e.target.id === '__sxg-highlight-overlay') return;
        SXG.highlight(e.target);
    }

    function onMouseOut() {
        if (!selectorModeActive) return;
        SXG.removeHighlight();
    }

    function onClick(e) {
        if (!selectorModeActive) return;
        if (SXG.isOverlayElement(e.target)) return;
        if (e.target.id === '__sxg-highlight-overlay') return;

        e.preventDefault();
        e.stopPropagation();

        SXG.removeHighlight();

        try {
            var results = SXG.generate(e.target);
            SXG.showOverlay(results);
        } catch (err) {
            SXG.showOverlay({
                best: { xpath: null, score: 0, label: 'Error', strategy: 'Generation failed: ' + err.message },
                alternative: { xpath: null, score: 0, label: 'N/A', strategy: 'None' },
                fallback: { xpath: null, score: 0, label: 'N/A', strategy: 'None' },
                reasoning: '\u274C Unexpected error: ' + err.message,
            });
        }
    }

    function onKeyDown(e) {
        if (e.key === 'Escape') {
            if (selectorModeActive) {
                deactivateSelectorMode();
                e.preventDefault();
            } else {
                SXG.destroyOverlay();
            }
        }
    }

    function activateSelectorMode() {
        if (selectorModeActive) return;
        selectorModeActive = true;

        SXG.initHighlighter();

        document.addEventListener('mouseover', onMouseOver, true);
        document.addEventListener('mouseout', onMouseOut, true);
        document.addEventListener('click', onClick, true);

        document.body.style.cursor = 'crosshair';

        try {
            chrome.runtime.sendMessage({ type: 'SELECTOR_MODE_CHANGED', active: true });
        } catch (_) { }
    }

    function deactivateSelectorMode() {
        if (!selectorModeActive) return;
        selectorModeActive = false;

        document.removeEventListener('mouseover', onMouseOver, true);
        document.removeEventListener('mouseout', onMouseOut, true);
        document.removeEventListener('click', onClick, true);

        SXG.removeHighlight();
        SXG.destroyHighlighter();
        SXG.destroyOverlay();

        document.body.style.cursor = '';

        try {
            chrome.runtime.sendMessage({ type: 'SELECTOR_MODE_CHANGED', active: false });
        } catch (_) { }
    }

    function toggleSelectorMode() {
        if (selectorModeActive) {
            deactivateSelectorMode();
        } else {
            activateSelectorMode();
        }
    }

    // Message handling
    chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
        switch (message.type) {
            case 'TOGGLE_SELECTOR_MODE':
                toggleSelectorMode();
                sendResponse({ active: selectorModeActive });
                break;
            case 'GET_SELECTOR_MODE_STATUS':
                sendResponse({ active: selectorModeActive });
                break;
            case 'ACTIVATE_SELECTOR_MODE':
                activateSelectorMode();
                sendResponse({ active: true });
                break;
            case 'DEACTIVATE_SELECTOR_MODE':
                deactivateSelectorMode();
                sendResponse({ active: false });
                break;
            default:
                sendResponse({ error: 'Unknown message type' });
        }
        return true;
    });

    // Escape key — always active
    document.addEventListener('keydown', onKeyDown, true);
    
    // document.documentElement.addEventListener('sxg:copy', function (e) {
    //     console.log('[SXG] clipboard success');
    //     var text = e.detail.text;
        
    //     navigator.clipboard.writeText(text).then(function () {
    //         e.target.dispatchEvent(new CustomEvent('sxg:copy-success', { bubbles: false }));
    //     }).catch(function () {
    //         // Fallback
    //         console.error('[SXG] clipboard failed:', err);
    //         var ta = document.createElement('textarea');
    //         ta.value = text;
    //         ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
    //         document.body.appendChild(ta);
    //         ta.focus();
    //         ta.select();
    //         document.execCommand('copy');
    //         console.log('[SXG] execCommand result:', ok);
    //         document.body.removeChild(ta);
    //         e.target.dispatchEvent(new CustomEvent('sxg:copy-success', { bubbles: false }));
    //     });
    // });
    // document.documentElement.addEventListener('sxg:copy', function (e) {
    //     console.log('[SXG] sxg:copy event received', e.detail); // ← Does this log?
    //     var text = e.detail.text;

    //     navigator.clipboard.writeText(text).then(function () {
    //         console.log('[SXG] clipboard success'); // ← Does this log?
    //         e.target.dispatchEvent(new CustomEvent('sxg:copy-success', { bubbles: false }));
    //     }).catch(function (err) {
    //         console.error('[SXG] clipboard failed:', err); // ← Or this?
    //         var ta = document.createElement('textarea');
    //         ta.value = text;
    //         ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
    //         document.body.appendChild(ta);
    //         ta.focus();
    //         ta.select();
    //         var ok = document.execCommand('copy');
    //         console.log('[SXG] execCommand result:', ok); // ← Did fallback work?
    //         document.body.removeChild(ta);
    //         if (ok) e.target.dispatchEvent(new CustomEvent('sxg:copy-success', { bubbles: false }));
    //     });
    // });
})();
