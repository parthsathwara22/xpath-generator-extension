/**
 * Dynamic Attribute Detector
 * Identifies and filters out dynamically-generated class names, IDs,
 * and attribute values that would produce unstable XPath selectors.
 */

window.SXG = window.SXG || {};

(function () {
    const DYNAMIC_PATTERNS = [
        /[_-][a-f0-9]{4,}$/i,
        /_{2,}[a-zA-Z0-9]{3,}$/,
        /^(css|sc|e|jss)-[a-z0-9]+$/i,
        /^sc-[a-zA-Z]{4,}$/,
        /^e[a-z0-9]{6,}$/,
        /[_-]\d{6,}$/,
        /^:[a-z0-9]+:$/,
        /^\d+$/,
        /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i,
        /^[A-Z][a-z]+[A-Z][a-z]+-[a-z]+-\d+$/,
        /^\[.+\]$/,
        /^_ng(content|host)-[a-z0-9]+$/i,
        /^data-v-[a-f0-9]+$/i,
    ];

    function isDynamicClass(className) {
        if (!className || className.length <= 1) return true;
        for (const pattern of DYNAMIC_PATTERNS) {
            if (pattern.test(className)) return true;
        }
        return false;
    }

    function isDynamic(attrName, attrValue) {
        if (!attrValue || attrValue.trim().length === 0) return true;
        const val = attrValue.trim();

        if (/^data-(testid|test|cy|test-id|qa)$/i.test(attrName)) return false;

        if (attrName === 'class') {
            const classes = val.split(/\s+/);
            return classes.every(c => isDynamicClass(c));
        }

        if (attrName === 'id') return !isStableId(val);

        for (const pattern of DYNAMIC_PATTERNS) {
            if (pattern.test(val)) return true;
        }
        return false;
    }

    function isStableId(idValue) {
        if (!idValue || idValue.trim().length === 0) return false;
        const val = idValue.trim();
        if (/^:[a-z0-9]+:$/.test(val)) return false;
        if (/^ember\d+$/.test(val)) return false;
        if (/^\d+$/.test(val)) return false;
        if (/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(val)) return false;
        if (/^[a-f0-9]{6,}$/i.test(val) && !/[g-zG-Z]/.test(val)) return false;
        if (/^[a-z]+-[a-f0-9]{4,}$/i.test(val)) return false;
        return true;
    }

    function getStableClasses(element) {
        const classAttr = element.getAttribute('class');
        if (!classAttr) return [];
        return classAttr.trim().split(/\s+/).filter(Boolean).filter(c => !isDynamicClass(c));
    }

    function getStableAttributes(element) {
        const stable = [];
        const attrs = element.attributes;
        if (!attrs) return stable;

        const priorityNames = ['id', 'data-testid', 'data-test', 'data-cy', 'data-qa', 'name',
            'aria-label', 'aria-labelledby', 'aria-describedby', 'role', 'type',
            'placeholder', 'title', 'alt', 'href', 'src', 'action', 'for'];

        for (const name of priorityNames) {
            const val = element.getAttribute(name);
            if (val && !isDynamic(name, val)) {
                stable.push({ name, value: val });
            }
        }

        for (let i = 0; i < attrs.length; i++) {
            const attr = attrs[i];
            if (attr.name.startsWith('data-') &&
                !priorityNames.includes(attr.name) &&
                !isDynamic(attr.name, attr.value)) {
                stable.push({ name: attr.name, value: attr.value });
            }
        }

        return stable;
    }

    // Expose on global namespace
    window.SXG.isDynamic = isDynamic;
    window.SXG.isStableId = isStableId;
    window.SXG.getStableClasses = getStableClasses;
    window.SXG.getStableAttributes = getStableAttributes;
})();
