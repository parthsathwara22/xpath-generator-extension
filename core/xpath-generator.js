/**
 * Smart XPath Generator
 * Multi-phase algorithm with retry loop and error boundary.
 * Phase 1: Self-identification | Phase 2: Ancestor anchoring | Phase 3: Fallback
 */

window.SXG = window.SXG || {};

(function () {
    var MAX_ANCESTOR_DEPTH = 5;

    /**
     * Main entry point.
     */
    function generate(element, contextNode) {
        contextNode = contextNode || document;

        try {
            if (!element || !element.tagName) {
                return errorResult('Invalid element: no tagName found.');
            }

            var tag = element.tagName.toLowerCase();
            var candidates = [];

            // ─── Phase 1: Self-identification ──────────────────────
            var phase1 = generateSelfXPaths(element, tag);
            for (var i = 0; i < phase1.length; i++) {
                phase1[i].phase = 1;
                if (SXG.isUnique(phase1[i].xpath, contextNode)) {
                    phase1[i].unique = true;
                    candidates.push(phase1[i]);
                }
            }

            // ─── Phase 2: Ancestor anchoring ──────────────────────
            var phase2 = generateAncestorXPaths(element, tag, contextNode);
            for (var j = 0; j < phase2.length; j++) {
                phase2[j].phase = 2;
                if (SXG.isUnique(phase2[j].xpath, contextNode)) {
                    phase2[j].unique = true;
                    candidates.push(phase2[j]);
                }
            }

            // ─── Phase 3: Fallback ────────────────────────────────
            var phase3 = generateFallbackXPaths(element, tag, contextNode);
            for (var k = 0; k < phase3.length; k++) {
                phase3[k].phase = 3;
                if (SXG.isUnique(phase3[k].xpath, contextNode)) {
                    phase3[k].unique = true;
                    candidates.push(phase3[k]);
                }
            }

            // If no unique candidates, add best non-unique ones
            if (candidates.length === 0) {
                var allCandidates = phase1.concat(phase2, phase3);
                for (var m = 0; m < allCandidates.length; m++) {
                    allCandidates[m].unique = false;
                    var matches = SXG.countMatches(allCandidates[m].xpath, contextNode);
                    if (matches > 0) {
                        allCandidates[m].matchCount = matches;
                        candidates.push(allCandidates[m]);
                    }
                }
            }

            // Score all
            for (var n = 0; n < candidates.length; n++) {
                var stability = SXG.computeStability(candidates[n].xpath, contextNode);
                candidates[n].score = stability.total;
                candidates[n].scoreBreakdown = stability.breakdown;
                candidates[n].label = SXG.getScoreLabel(stability.total);
            }

            // Sort: unique first, then by score descending
            candidates.sort(function (a, b) {
                if (a.unique !== b.unique) return a.unique ? -1 : 1;
                return b.score - a.score;
            });

            var best = candidates[0] || null;
            var alternative = candidates.length > 1 ? candidates[1] : null;
            var fallback = candidates.length > 2 ? candidates[2] : null;

            return {
                best: formatResult(best),
                alternative: formatResult(alternative),
                fallback: formatResult(fallback),
                reasoning: buildReasoning(best, alternative, fallback),
            };
        } catch (err) {
            return errorResult('XPath generation failed: ' + err.message);
        }
    }

    // ──────────────────────────────────────────────────────────
    // Phase 1: Self-identification
    // ──────────────────────────────────────────────────────────

    function generateSelfXPaths(element, tag) {
        var results = [];
        var esc = SXG.escapeXPathValue;

        // ID
        var id = element.getAttribute('id');
        if (id && SXG.isStableId(id)) {
            results.push({ xpath: '//' + tag + '[@id=' + esc(id) + ']', strategy: 'Unique stable ID' });
        }

        // Stable attributes
        var stableAttrs = SXG.getStableAttributes(element);
        for (var i = 0; i < stableAttrs.length; i++) {
            if (stableAttrs[i].name === 'id') continue;
            results.push({
                xpath: '//' + tag + '[@' + stableAttrs[i].name + '=' + esc(stableAttrs[i].value) + ']',
                strategy: 'Stable attribute @' + stableAttrs[i].name,
            });
        }

        // Stable classes
        var stableClasses = SXG.getStableClasses(element);
        if (stableClasses.length > 0) {
            var fullClassValue = element.getAttribute('class');
            var allClassCount = fullClassValue.trim().split(/\s+/).length;
            if (stableClasses.length === allClassCount) {
                results.push({
                    xpath: '//' + tag + '[@class=' + esc(fullClassValue.trim()) + ']',
                    strategy: 'Exact class match (all stable)',
                });
            }
            for (var ci = 0; ci < stableClasses.length; ci++) {
                results.push({
                    xpath: '//' + tag + '[contains(@class,' + esc(stableClasses[ci]) + ')]',
                    strategy: 'Contains stable class "' + stableClasses[ci] + '"',
                });
            }
        }

        // Text-based
        var text = getVisibleText(element);
        var textTags = ['button', 'a', 'label', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'option', 'th', 'td', 'summary'];
        if (text && text.length > 0 && text.length <= 80 && textTags.indexOf(tag) !== -1) {
            results.push({
                xpath: '//' + tag + '[normalize-space()=' + esc(text) + ']',
                strategy: 'Text content match',
            });
        }

        // Multi-attribute combination
        if (stableAttrs.length >= 2) {
            var top2 = stableAttrs.slice(0, 2);
            var predicates = top2.map(function (a) {
                return '@' + a.name + '=' + esc(a.value);
            }).join(' and ');
            results.push({
                xpath: '//' + tag + '[' + predicates + ']',
                strategy: 'Combined: ' + top2.map(function (a) { return a.name; }).join(' + '),
            });
        }

        return results;
    }

    // ──────────────────────────────────────────────────────────
    // Phase 2: Ancestor anchoring
    // ──────────────────────────────────────────────────────────

    function generateAncestorXPaths(element, tag, contextNode) {
        var results = [];
        var ancestor = element.parentElement;
        var depth = 0;

        while (ancestor && ancestor !== document.body && ancestor !== document.documentElement && depth < MAX_ANCESTOR_DEPTH) {
            var ancestorTag = ancestor.tagName.toLowerCase();
            var anchorXPath = findBestSelfXPath(ancestor, ancestorTag);

            if (anchorXPath) {
                var selfPart = buildTargetPart(element, tag);

                results.push({
                    xpath: anchorXPath + '//' + selfPart,
                    strategy: 'Anchored to ' + ancestorTag + ' (depth ' + (depth + 1) + ')',
                });

                if (element.parentElement === ancestor) {
                    results.push({
                        xpath: anchorXPath + '/' + selfPart,
                        strategy: 'Direct child of ' + ancestorTag,
                    });
                }
            }

            ancestor = ancestor.parentElement;
            depth++;
        }

        return results;
    }

    function findBestSelfXPath(element, tag) {
        var esc = SXG.escapeXPathValue;

        var id = element.getAttribute('id');
        if (id && SXG.isStableId(id)) {
            return '//' + tag + '[@id=' + esc(id) + ']';
        }

        var stableAttrs = SXG.getStableAttributes(element);
        for (var i = 0; i < stableAttrs.length; i++) {
            if (stableAttrs[i].name === 'id') continue;
            var xpath = '//' + tag + '[@' + stableAttrs[i].name + '=' + esc(stableAttrs[i].value) + ']';
            if (SXG.isUnique(xpath)) return xpath;
        }

        var stableClasses = SXG.getStableClasses(element);
        for (var ci = 0; ci < stableClasses.length; ci++) {
            var cxpath = '//' + tag + '[contains(@class,' + esc(stableClasses[ci]) + ')]';
            if (SXG.isUnique(cxpath)) return cxpath;
        }

        var role = element.getAttribute('role');
        if (role) {
            var rxpath = '//' + tag + '[@role=' + esc(role) + ']';
            if (SXG.isUnique(rxpath)) return rxpath;
        }

        return null;
    }

    function buildTargetPart(element, tag) {
        var esc = SXG.escapeXPathValue;

        var id = element.getAttribute('id');
        if (id && SXG.isStableId(id)) {
            return tag + '[@id=' + esc(id) + ']';
        }

        var stableAttrs = SXG.getStableAttributes(element);
        if (stableAttrs.length > 0) {
            var best = stableAttrs[0];
            return tag + '[@' + best.name + '=' + esc(best.value) + ']';
        }

        var stableClasses = SXG.getStableClasses(element);
        if (stableClasses.length > 0) {
            return tag + '[contains(@class,' + esc(stableClasses[0]) + ')]';
        }

        var text = getVisibleText(element);
        if (text && text.length > 0 && text.length <= 50) {
            return tag + '[normalize-space()=' + esc(text) + ']';
        }

        return tag;
    }

    // ──────────────────────────────────────────────────────────
    // Phase 3: Fallback
    // ──────────────────────────────────────────────────────────

    function generateFallbackXPaths(element, tag, contextNode) {
        var results = [];
        var esc = SXG.escapeXPathValue;

        // Sibling-based
        var prevSibling = findMeaningfulPreviousSibling(element);
        if (prevSibling) {
            var sibTag = prevSibling.tagName.toLowerCase();
            var sibText = getVisibleText(prevSibling);
            if (sibText && sibText.length <= 50) {
                results.push({
                    xpath: '//' + sibTag + '[normalize-space()=' + esc(sibText) + ']/following-sibling::' + tag + '[1]',
                    strategy: 'Following sibling of labeled element',
                });
            }
        }

        // Scoped positional index
        var parent = element.parentElement;
        if (parent) {
            var parentXPath = findBestSelfXPath(parent, parent.tagName.toLowerCase());
            if (parentXPath) {
                var sameTagSiblings = [];
                for (var c = 0; c < parent.children.length; c++) {
                    if (parent.children[c].tagName.toLowerCase() === tag) {
                        sameTagSiblings.push(parent.children[c]);
                    }
                }
                if (sameTagSiblings.length > 1) {
                    var idx = sameTagSiblings.indexOf(element) + 1;
                    results.push({
                        xpath: parentXPath + '/' + tag + '[' + idx + ']',
                        strategy: 'Indexed child [' + idx + '] within stable parent',
                    });
                }
            }
        }

        // Global index (fragile)
        var allOfType = document.getElementsByTagName(tag);
        if (allOfType.length > 0 && allOfType.length <= 100) {
            var gIdx = Array.from(allOfType).indexOf(element) + 1;
            if (gIdx > 0) {
                results.push({
                    xpath: '(//' + tag + ')[' + gIdx + ']',
                    strategy: 'Global index [' + gIdx + '] of <' + tag + '> (fragile)',
                });
            }
        }

        // Type + placeholder (inputs)
        var type = element.getAttribute('type');
        if (type) {
            var placeholder = element.getAttribute('placeholder');
            if (placeholder) {
                results.push({
                    xpath: '//' + tag + '[@type=' + esc(type) + ' and @placeholder=' + esc(placeholder) + ']',
                    strategy: 'Type + placeholder combination',
                });
            }
        }

        return results;
    }

    function findMeaningfulPreviousSibling(element) {
        var sibling = element.previousElementSibling;
        var meaningfulTags = ['label', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'legend', 'caption', 'dt', 'th'];
        while (sibling) {
            if (meaningfulTags.indexOf(sibling.tagName.toLowerCase()) !== -1) return sibling;
            sibling = sibling.previousElementSibling;
        }
        return null;
    }

    // ──────────────────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────────────────

    function getVisibleText(element) {
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            return (element.getAttribute('placeholder') || element.value || '').trim();
        }
        var text = element.textContent || '';
        var trimmed = text.replace(/\s+/g, ' ').trim();
        return trimmed.length > 80 ? '' : trimmed;
    }

    function formatResult(candidate) {
        if (!candidate) {
            return { xpath: null, score: 0, label: 'N/A', strategy: 'None available' };
        }
        return {
            xpath: candidate.xpath,
            score: candidate.score,
            label: candidate.label,
            strategy: candidate.strategy,
            phase: candidate.phase,
            unique: candidate.unique,
        };
    }

    function buildReasoning(best, alt, fallback) {
        var lines = [];
        if (best) {
            lines.push('✅ Best (Phase ' + best.phase + ', Score ' + best.score + '): ' + best.strategy + '.');
            if (best.unique === false) {
                lines.push('   ⚠ Not fully unique — matches ' + (best.matchCount || '?') + ' elements.');
            }
        } else {
            lines.push('❌ No suitable XPath found for this element.');
        }
        if (alt) {
            lines.push('🔄 Alternative (Phase ' + alt.phase + ', Score ' + alt.score + '): ' + alt.strategy + '.');
        }
        if (fallback) {
            lines.push('🔙 Fallback (Phase ' + fallback.phase + ', Score ' + fallback.score + '): ' + fallback.strategy + '.');
        }
        return lines.join('\n');
    }

    function errorResult(message) {
        return {
            best: { xpath: null, score: 0, label: 'Error', strategy: message },
            alternative: { xpath: null, score: 0, label: 'N/A', strategy: 'None' },
            fallback: { xpath: null, score: 0, label: 'N/A', strategy: 'None' },
            reasoning: '❌ ' + message,
        };
    }

    window.SXG.generate = generate;
})();
