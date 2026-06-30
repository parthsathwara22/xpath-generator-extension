/**
 * Results Overlay
 * Floating, draggable dark panel in Shadow DOM.
 * Appended to document.documentElement. All events use stopPropagation.
 */

window.SXG = window.SXG || {};

(function () {
  var shadowHost = null;
  var shadowRoot = null;
  var panel = null;
  var isDragging = false;
  var dragOffsetX = 0;
  var dragOffsetY = 0;

  var STYLES = [
    ':host{all:initial;position:fixed;z-index:2147483647;font-family:"Segoe UI",-apple-system,BlinkMacSystemFont,"Inter","Roboto",sans-serif;font-size:13px;color:#e2e8f0}',
    '*{box-sizing:border-box;margin:0;padding:0}',
    '.sxg-panel{position:fixed;top:20px;right:20px;width:480px;max-height:90vh;background:rgba(15,23,42,.95);backdrop-filter:blur(16px);border:1px solid rgba(99,102,241,.3);border-radius:12px;box-shadow:0 0 0 1px rgba(99,102,241,.1),0 20px 50px rgba(0,0,0,.6),0 0 40px rgba(99,102,241,.08);overflow:hidden;display:flex;flex-direction:column;animation:sxg-slideIn .2s ease-out}',
    '@keyframes sxg-slideIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}',
    '.sxg-header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:rgba(30,41,59,.8);border-bottom:1px solid rgba(99,102,241,.2);cursor:grab;user-select:none}',
    '.sxg-header:active{cursor:grabbing}',
    '.sxg-title{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:#c7d2fe;letter-spacing:.02em}',
    '.sxg-title-icon{font-size:16px}',
    '.sxg-close{background:0 0;border:none;color:#94a3b8;font-size:18px;cursor:pointer;padding:4px 8px;border-radius:6px;transition:all .15s;line-height:1}',
    '.sxg-close:hover{background:rgba(239,68,68,.2);color:#f87171}',
    '.sxg-body{padding:8px;overflow-y:auto;flex:1}',
    '.sxg-result{padding:12px;margin-bottom:6px;background:rgba(30,41,59,.5);border-radius:8px;border:1px solid rgba(71,85,105,.3);transition:border-color .15s}',
    '.sxg-result:hover{border-color:rgba(99,102,241,.4)}',
    '.sxg-result-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}',
    '.sxg-badge{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;padding:3px 8px;border-radius:4px}',
    '.sxg-badge-best{background:rgba(34,197,94,.15);color:#4ade80;border:1px solid rgba(34,197,94,.3)}',
    '.sxg-badge-alt{background:rgba(59,130,246,.15);color:#60a5fa;border:1px solid rgba(59,130,246,.3)}',
    '.sxg-badge-fallback{background:rgba(234,179,8,.15);color:#facc15;border:1px solid rgba(234,179,8,.3)}',
    '.sxg-score{font-size:12px;font-weight:600;padding:2px 8px;border-radius:10px}',
    '.sxg-score-excellent{background:rgba(34,197,94,.15);color:#4ade80}',
    '.sxg-score-good{background:rgba(59,130,246,.15);color:#60a5fa}',
    '.sxg-score-fair{background:rgba(234,179,8,.15);color:#facc15}',
    '.sxg-score-poor{background:rgba(239,68,68,.15);color:#f87171}',
    '.sxg-xpath-row{display:flex;align-items:center;gap:8px}',
    '.sxg-xpath-text{flex:1;font-family:"Cascadia Code","Fira Code","JetBrains Mono","Consolas",monospace;font-size:12px;color:#a5b4fc;background:rgba(15,23,42,.6);padding:8px 10px;border-radius:6px;border:1px solid rgba(71,85,105,.2);word-break:break-all;line-height:1.5}',
    '.sxg-copy-btn{flex-shrink:0;background:rgba(99,102,241,.15);border:1px solid rgba(99,102,241,.3);color:#a5b4fc;padding:6px 10px;border-radius:6px;cursor:pointer;font-size:12px;transition:all .15s;white-space:nowrap}',
    '.sxg-copy-btn:hover{background:rgba(99,102,241,.3);color:#c7d2fe}',
    '.sxg-copy-btn.copied{background:rgba(34,197,94,.2);border-color:rgba(34,197,94,.4);color:#4ade80}',
    '.sxg-strategy{font-size:11px;color:#64748b;margin-top:6px;font-style:italic}',
    '.sxg-reasoning{padding:10px 12px;margin:4px 0;background:rgba(30,41,59,.4);border-radius:8px;border-left:3px solid rgba(99,102,241,.5);font-size:12px;color:#94a3b8;white-space:pre-line;line-height:1.6}',
    '.sxg-error{padding:16px;text-align:center;color:#f87171;font-size:13px}',
    '.sxg-footer{padding:8px 16px;border-top:1px solid rgba(71,85,105,.2);text-align:center;font-size:10px;color:#475569;letter-spacing:.03em}',
  ].join('\n');

  function showOverlay(results) {
    destroyOverlay();
    createShadowHost();
    renderResults(results);
  }

  function destroyOverlay() {
    if (shadowHost) {
      shadowHost.remove();
      shadowHost = null;
      shadowRoot = null;
      panel = null;
    }
    isDragging = false;
  }

  // function isOverlayElement(el) {
  //   if (!shadowHost) return false;
  //   return shadowHost === el || shadowHost.contains(el);
  // }

  function isOverlayElement(el) {
    if (!shadowHost) return false;
    if (shadowHost === el) return true;
    // Check if element lives inside the shadow root
    var root = el.getRootNode();
    return root === shadowRoot;
  }

  function createShadowHost() {
    shadowHost = document.createElement('div');
    shadowHost.id = '__sxg-overlay-host';

    var blockEvents = ['mousedown', 'mouseup', 'mousemove', 'pointerdown',
      'pointerup', 'pointermove', 'keydown', 'keyup', 'input', 'focus', 'blur'];
    for (var i = 0; i < blockEvents.length; i++) {
      shadowHost.addEventListener(blockEvents[i], function (e) { e.stopPropagation(); }, true);
    }

    shadowRoot = shadowHost.attachShadow({ mode: 'open' });

    var style = document.createElement('style');
    style.textContent = STYLES;
    shadowRoot.appendChild(style);

    document.documentElement.appendChild(shadowHost);
  }

  function renderResults(results) {
    panel = document.createElement('div');
    panel.className = 'sxg-panel';

    // Header
    var header = document.createElement('div');
    header.className = 'sxg-header';
    header.innerHTML = '<div class="sxg-title"><span class="sxg-title-icon">\u26A1</span>Smart XPath Generator</div>';

    var closeBtn = document.createElement('button');
    closeBtn.className = 'sxg-close';
    closeBtn.textContent = '\u2715';
    closeBtn.addEventListener('click', function () { destroyOverlay(); });
    header.appendChild(closeBtn);

    header.addEventListener('mousedown', onDragStart);
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);

    panel.appendChild(header);

    // Body
    var body = document.createElement('div');
    body.className = 'sxg-body';

    if (results.best && results.best.xpath) {
      body.appendChild(createResultCard(results.best, 'best', 'Best'));
    }
    if (results.alternative && results.alternative.xpath) {
      body.appendChild(createResultCard(results.alternative, 'alt', 'Alternative'));
    }
    if (results.fallback && results.fallback.xpath) {
      body.appendChild(createResultCard(results.fallback, 'fallback', 'Fallback'));
    }

    if (!results.best || !results.best.xpath) {
      var errDiv = document.createElement('div');
      errDiv.className = 'sxg-error';
      errDiv.textContent = '\u26A0 Could not generate a reliable XPath for this element.';
      body.appendChild(errDiv);
    }

    if (results.reasoning) {
      var reasoning = document.createElement('div');
      reasoning.className = 'sxg-reasoning';
      reasoning.textContent = results.reasoning;
      body.appendChild(reasoning);
    }

    panel.appendChild(body);

    var footer = document.createElement('div');
    footer.className = 'sxg-footer';
    footer.textContent = 'ESC to close \u00B7 Drag header to reposition';
    panel.appendChild(footer);

    shadowRoot.appendChild(panel);
  }

  function createResultCard(result, type, label) {
    var card = document.createElement('div');
    card.className = 'sxg-result';

    var headerRow = document.createElement('div');
    headerRow.className = 'sxg-result-header';

    var badge = document.createElement('span');
    badge.className = 'sxg-badge sxg-badge-' + type;
    badge.textContent = label;
    headerRow.appendChild(badge);

    var scoreClass = result.label === 'Excellent' ? 'excellent' :
      result.label === 'Good' ? 'good' :
        result.label === 'Fair' ? 'fair' : 'poor';
    var score = document.createElement('span');
    score.className = 'sxg-score sxg-score-' + scoreClass;
    score.textContent = result.score + '/100 ' + result.label;
    headerRow.appendChild(score);
    card.appendChild(headerRow);

    var row = document.createElement('div');
    row.className = 'sxg-xpath-row';

    var text = document.createElement('div');
    text.className = 'sxg-xpath-text';
    text.textContent = result.xpath;
    row.appendChild(text);

    var copyBtn = document.createElement('button');
    copyBtn.className = 'sxg-copy-btn';
    copyBtn.textContent = '\uD83D\uDCCB Copy';
    // copyBtn.addEventListener('click', function () {
    //   navigator.clipboard.writeText(result.xpath).then(function () {
    //     copyBtn.textContent = '\u2713 Copied';
    //     copyBtn.classList.add('copied');
    //     setTimeout(function () {
    //       copyBtn.textContent = '\uD83D\uDCCB Copy';
    //       copyBtn.classList.remove('copied');
    //     }, 1500);
    //   });
    // });
    // copyBtn.addEventListener('click', function (e) {
    //   e.stopPropagation();
    //   console.log('[SXG] Copy button clicked!'); 
      
    //   // Dispatch a custom event OUTSIDE the shadow DOM
    //   shadowHost.dispatchEvent(new CustomEvent('sxg:copy', {
    //     bubbles: true,
    //     detail: { text: result.xpath }
    //   }));

    //   function markCopied() {
    //     copyBtn.textContent = '✓ Copied';
    //     copyBtn.classList.add('copied');
    //     setTimeout(function () {
    //       copyBtn.textContent = '📋 Copy';
    //       copyBtn.classList.remove('copied');
    //     }, 2000);
    //   }

    //   // Listen for success confirmation
    //   shadowHost.addEventListener('sxg:copy-success', markCopied, { once: true });
    // });
    
    copyBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      console.log('[SXG] Copy button clicked!');

      navigator.clipboard.writeText(result.xpath).then(function () {
        console.log('[SXG] clipboard success!');
        copyBtn.textContent = '✓ Copied';
        copyBtn.classList.add('copied');
        setTimeout(function () {
          copyBtn.textContent = '📋 Copy';
          copyBtn.classList.remove('copied');
        }, 2000);
      }).catch(function (err) {
        console.error('[SXG] clipboard failed:', err);
      });
    });
    row.appendChild(copyBtn);
    card.appendChild(row);

    if (result.strategy) {
      var strategy = document.createElement('div');
      strategy.className = 'sxg-strategy';
      strategy.textContent = 'Strategy: ' + result.strategy;
      card.appendChild(strategy);
    }

    return card;
  }

  function onDragStart(e) {
    if (!panel) return;
    isDragging = true;
    var rect = panel.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
    e.preventDefault();
  }

  function onDragMove(e) {
    if (!isDragging || !panel) return;
    panel.style.left = (e.clientX - dragOffsetX) + 'px';
    panel.style.top = (e.clientY - dragOffsetY) + 'px';
    panel.style.right = 'auto';
    e.preventDefault();
  }

  function onDragEnd() {
    isDragging = false;
  }

  window.SXG.showOverlay = showOverlay;
  window.SXG.destroyOverlay = destroyOverlay;
  window.SXG.isOverlayElement = isOverlayElement;
})();
