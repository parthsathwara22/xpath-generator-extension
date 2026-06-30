/**
 * XPath Validator
 * Evaluates XPath expressions against the DOM and checks uniqueness.
 * Supports custom context nodes for iframe/Shadow DOM scenarios.
 */

window.SXG = window.SXG || {};

(function () {
    function countMatches(xpath, contextNode) {
        contextNode = contextNode || document;
        try {
            const result = contextNode.evaluate(
                xpath, contextNode, null,
                XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null
            );
            return result.snapshotLength;
        } catch (e) {
            return -1;
        }
    }

    function isUnique(xpath, contextNode) {
        return countMatches(xpath, contextNode) === 1;
    }

    function getFirstMatch(xpath, contextNode) {
        contextNode = contextNode || document;
        try {
            const result = contextNode.evaluate(
                xpath, contextNode, null,
                XPathResult.FIRST_ORDERED_NODE_TYPE, null
            );
            return result.singleNodeValue;
        } catch (e) {
            return null;
        }
    }

    function matchesElement(xpath, expectedElement, contextNode) {
        const match = getFirstMatch(xpath, contextNode);
        return match === expectedElement;
    }

    /**
     * Escape a string value for use inside an XPath expression.
     * Handles values with single quotes, double quotes, or both using concat().
     */
    function escapeXPathValue(value) {
        if (!value.includes("'")) {
            return "'" + value + "'";
        }
        if (!value.includes('"')) {
            return '"' + value + '"';
        }
        // Contains both — use concat()
        var parts = [];
        var remaining = value;
        while (remaining.length > 0) {
            var singleIdx = remaining.indexOf("'");
            var doubleIdx = remaining.indexOf('"');

            if (singleIdx === -1) {
                parts.push("'" + remaining + "'");
                break;
            } else if (doubleIdx === -1) {
                parts.push('"' + remaining + '"');
                break;
            } else if (singleIdx < doubleIdx) {
                var chunk = remaining.substring(0, singleIdx + 1);
                parts.push('"' + chunk + '"');
                remaining = remaining.substring(singleIdx + 1);
            } else {
                var chunk2 = remaining.substring(0, doubleIdx + 1);
                parts.push("'" + chunk2 + "'");
                remaining = remaining.substring(doubleIdx + 1);
            }
        }
        return 'concat(' + parts.join(',') + ')';
    }

    window.SXG.countMatches = countMatches;
    window.SXG.isUnique = isUnique;
    window.SXG.getFirstMatch = getFirstMatch;
    window.SXG.matchesElement = matchesElement;
    window.SXG.escapeXPathValue = escapeXPathValue;
})();
