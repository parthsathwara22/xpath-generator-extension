/**
 * Element Highlighter
 * Non-intrusive hover highlight using a positioned overlay div.
 */

window.SXG = window.SXG || {};

(function () {
    var highlightOverlay = null;

    function initHighlighter() {
        if (highlightOverlay) return;
        highlightOverlay = document.createElement('div');
        highlightOverlay.id = '__sxg-highlight-overlay';
        highlightOverlay.style.cssText =
            'position:fixed;pointer-events:none;border:2px solid #4A90D9;' +
            'background:rgba(74,144,217,0.12);border-radius:3px;' +
            'z-index:2147483646;transition:all 0.08s ease;display:none;';
        document.documentElement.appendChild(highlightOverlay);
    }

    function highlight(element) {
        if (!highlightOverlay || !element) return;
        var rect = element.getBoundingClientRect();
        highlightOverlay.style.top = rect.top + 'px';
        highlightOverlay.style.left = rect.left + 'px';
        highlightOverlay.style.width = rect.width + 'px';
        highlightOverlay.style.height = rect.height + 'px';
        highlightOverlay.style.display = 'block';
    }

    function removeHighlight() {
        if (!highlightOverlay) return;
        highlightOverlay.style.display = 'none';
    }

    function destroyHighlighter() {
        if (highlightOverlay) {
            highlightOverlay.remove();
            highlightOverlay = null;
        }
    }

    window.SXG.initHighlighter = initHighlighter;
    window.SXG.highlight = highlight;
    window.SXG.removeHighlight = removeHighlight;
    window.SXG.destroyHighlighter = destroyHighlighter;
})();
