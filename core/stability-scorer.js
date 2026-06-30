/**
 * XPath Stability Scorer
 * Evaluates an XPath on a 0–100 scale based on five weighted factors.
 */

window.SXG = window.SXG || {};

(function () {
    var SEMANTIC_TAGS = [
        'button', 'input', 'select', 'textarea', 'a', 'nav', 'header', 'footer',
        'main', 'section', 'article', 'aside', 'form', 'label', 'table', 'th',
        'td', 'tr', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'img', 'video', 'audio', 'figure', 'figcaption', 'dialog', 'details', 'summary'
    ];

    function computeStability(xpath, contextNode) {
        contextNode = contextNode || document;
        var breakdown = {
            attributeReliability: scoreAttributeReliability(xpath),
            uniqueness: scoreUniqueness(xpath, contextNode),
            domDepth: scoreDomDepth(xpath),
            dynamicRisk: scoreDynamicRisk(xpath),
            readability: scoreReadability(xpath),
        };

        var total = Math.round(
            breakdown.attributeReliability +
            breakdown.uniqueness +
            breakdown.domDepth +
            breakdown.dynamicRisk +
            breakdown.readability
        );

        return { total: Math.min(100, Math.max(0, total)), breakdown: breakdown };
    }

    function scoreAttributeReliability(xpath) {
        if (/@id\s*=/.test(xpath)) return 35;
        if (/@data-(testid|test|cy|qa)\s*=/.test(xpath)) return 33;
        if (/@data-[a-z]/.test(xpath)) return 30;
        if (/@name\s*=/.test(xpath)) return 25;
        if (/@aria-label\s*=/.test(xpath)) return 22;
        if (/@aria-/.test(xpath)) return 20;
        if (/@role\s*=/.test(xpath)) return 18;
        if (/normalize-space\(\)|text\(\)/.test(xpath)) return 18;
        if (/@(placeholder|title|alt|for|href|src|action)\s*=/.test(xpath)) return 16;
        if (/@class\s*=/.test(xpath)) return 12;
        if (/contains\s*\(\s*@class/.test(xpath)) return 10;
        if (/@type\s*=/.test(xpath)) return 8;
        return 5;
    }

    function scoreUniqueness(xpath, contextNode) {
        var count = SXG.countMatches(xpath, contextNode);
        if (count === 1) return 25;
        if (count >= 2 && count <= 3) return 10;
        if (count >= 4 && count <= 10) return 3;
        return 0;
    }

    function scoreDomDepth(xpath) {
        var steps = xpath.split(/\/+/).filter(Boolean).length;
        if (steps <= 2) return 15;
        if (steps <= 3) return 12;
        if (steps <= 4) return 10;
        if (steps <= 5) return 7;
        if (steps <= 6) return 5;
        return 2;
    }

    function scoreDynamicRisk(xpath) {
        var score = 15;
        if (/[_-][a-f0-9]{4,}/i.test(xpath)) score -= 8;
        if (/_{2,}[a-zA-Z0-9]{3,}/.test(xpath)) score -= 6;
        if (/(css|sc|jss|e)\-[a-z0-9]+/i.test(xpath)) score -= 8;
        if (/contains\s*\(\s*@class/.test(xpath)) score -= 4;
        if (/\[\d+\]/.test(xpath)) score -= 3;
        return Math.max(0, score);
    }

    function scoreReadability(xpath) {
        var score = 0;

        // Length bonus (max 3)
        if (xpath.length < 50) score += 3;
        else if (xpath.length < 80) score += 2;
        else if (xpath.length < 120) score += 1;

        // Semantic tag bonus (max 4)
        var tagMatches = xpath.match(/\/\/([a-z][a-z0-9]*)/gi) || [];
        var hasSemantic = tagMatches.some(function (t) {
            var tag = t.replace(/^\/+/, '').toLowerCase();
            return SEMANTIC_TAGS.indexOf(tag) !== -1;
        });
        if (hasSemantic) score += 4;

        // Meaningful attribute name bonus (max 3)
        if (/@(id|name|data-testid|data-test|aria-label|role|placeholder|title|alt|for)\s*=/.test(xpath)) score += 3;

        return Math.min(10, score);
    }

    function getScoreLabel(score) {
        if (score >= 80) return 'Excellent';
        if (score >= 60) return 'Good';
        if (score >= 40) return 'Fair';
        return 'Poor';
    }

    window.SXG.computeStability = computeStability;
    window.SXG.getScoreLabel = getScoreLabel;
})();
