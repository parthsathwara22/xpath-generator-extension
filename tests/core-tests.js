/**
 * Unit Tests — Smart XPath Generator Core Modules
 *
 * Run: Open test-runner.html in Chrome to execute tests.
 * Since we use IIFE + window.SXG (no bundler), tests run in-browser.
 */

window.TestRunner = (function () {
    var passed = 0;
    var failed = 0;
    var results = [];

    function assert(condition, testName) {
        if (condition) {
            passed++;
            results.push({ status: 'PASS', name: testName });
        } else {
            failed++;
            results.push({ status: 'FAIL', name: testName });
            console.error('FAIL:', testName);
        }
    }

    function assertEqual(actual, expected, testName) {
        assert(actual === expected, testName + ' (got: ' + actual + ', expected: ' + expected + ')');
    }

    function report() {
        console.log('\n===== TEST RESULTS =====');
        console.log('Passed: ' + passed + ' | Failed: ' + failed + ' | Total: ' + (passed + failed));
        results.forEach(function (r) {
            console.log(r.status + ': ' + r.name);
        });

        // Render to page
        var output = document.getElementById('test-output');
        if (output) {
            var html = '<h2>Test Results: ' + passed + ' passed, ' + failed + ' failed</h2>';
            results.forEach(function (r) {
                var color = r.status === 'PASS' ? '#4ade80' : '#f87171';
                html += '<div style="color:' + color + ';padding:2px 0;font-family:monospace;font-size:13px;">' +
                    r.status + ': ' + r.name + '</div>';
            });
            output.innerHTML = html;
        }
    }

    // ═══════════════════════════════════════════════════════════
    // Dynamic Detector Tests
    // ═══════════════════════════════════════════════════════════

    function testDynamicDetector() {
        console.log('\n--- Dynamic Detector Tests ---');

        // Stable IDs
        assert(SXG.isStableId('search-box'), 'search-box is stable ID');
        assert(SXG.isStableId('main-nav'), 'main-nav is stable ID');
        assert(SXG.isStableId('loginForm'), 'loginForm is stable ID');
        assert(SXG.isStableId('user-profile'), 'user-profile is stable ID');

        // Dynamic IDs
        assert(!SXG.isStableId(':r1:'), ':r1: is dynamic (React 18)');
        assert(!SXG.isStableId(':r2a:'), ':r2a: is dynamic (React 18)');
        assert(!SXG.isStableId('ember123'), 'ember123 is dynamic (Ember)');
        assert(!SXG.isStableId('12345'), '12345 is dynamic (numeric)');
        assert(!SXG.isStableId('a3f9c2d1'), 'a3f9c2d1 is dynamic (hex)');
        assert(!SXG.isStableId('component-8f3a'), 'component-8f3a is dynamic');
        assert(!SXG.isStableId(''), 'empty string is not stable');

        // Stable classes
        assert(!SXG.isDynamic('class', 'btn btn-primary'), 'btn btn-primary is stable');
        assert(!SXG.isDynamic('class', 'nav-item active'), 'nav-item active is stable');
        assert(!SXG.isDynamic('class', 'product-card'), 'product-card is stable');

        // Dynamic classes
        assert(SXG.isDynamic('class', 'css-1dbjc4n'), 'css-1dbjc4n is dynamic (Emotion)');
        assert(SXG.isDynamic('class', 'sc-bZQynM'), 'sc-bZQynM is dynamic (SC)');
        assert(SXG.isDynamic('class', 'styles__header___3xJ2k'), 'CSS module hash is dynamic');
        assert(SXG.isDynamic('class', 'jss482'), 'jss482 is dynamic (JSS)');

        // Mixed classes (has both stable and dynamic)
        assert(!SXG.isDynamic('class', 'btn css-1dbjc4n'), 'Mixed: has stable "btn" → not fully dynamic');

        // Test-infrastructure attributes are always stable
        assert(!SXG.isDynamic('data-testid', 'submit-btn'), 'data-testid is always stable');
        assert(!SXG.isDynamic('data-cy', 'login-form'), 'data-cy is always stable');
        assert(!SXG.isDynamic('data-test', 'search-input'), 'data-test is always stable');

        // getStableClasses
        var el = document.createElement('div');
        el.className = 'btn btn-primary css-1dbjc4n sc-abc123';
        var stable = SXG.getStableClasses(el);
        assert(stable.indexOf('btn') !== -1, 'getStableClasses includes "btn"');
        assert(stable.indexOf('btn-primary') !== -1, 'getStableClasses includes "btn-primary"');
        assert(stable.indexOf('css-1dbjc4n') === -1, 'getStableClasses excludes "css-1dbjc4n"');
        assert(stable.indexOf('sc-abc123') === -1, 'getStableClasses excludes "sc-abc123"');
    }

    // ═══════════════════════════════════════════════════════════
    // XPath Validator Tests
    // ═══════════════════════════════════════════════════════════

    function testXPathValidator() {
        console.log('\n--- XPath Validator Tests ---');

        // escapeXPathValue
        assertEqual(SXG.escapeXPathValue('hello'), "'hello'", 'Simple string escapes with single quotes');
        assertEqual(SXG.escapeXPathValue("it's"), '"it\'s"', 'String with single quote uses double quotes');
        assertEqual(SXG.escapeXPathValue('say "hi"'), "'say \"hi\"'", 'String with double quote uses single quotes');

        // Mixed quotes use concat
        var mixed = SXG.escapeXPathValue("it's a \"test\"");
        assert(mixed.indexOf('concat(') === 0, 'Mixed quotes produce concat()');

        // isUnique on document
        var testEl = document.createElement('div');
        testEl.id = '__sxg-unittest-unique-el';
        document.body.appendChild(testEl);
        assert(SXG.isUnique("//div[@id='__sxg-unittest-unique-el']"), 'isUnique returns true for unique element');
        testEl.remove();

        // countMatches
        assertEqual(SXG.countMatches('//invalidxpath[[['), -1, 'Invalid XPath returns -1');
    }

    // ═══════════════════════════════════════════════════════════
    // Stability Scorer Tests
    // ═══════════════════════════════════════════════════════════

    function testStabilityScorer() {
        console.log('\n--- Stability Scorer Tests ---');

        // Create a test element
        var testEl = document.createElement('button');
        testEl.id = '__sxg-unittest-scorer-btn';
        testEl.textContent = 'Test Button';
        document.body.appendChild(testEl);

        var result = SXG.computeStability("//button[@id='__sxg-unittest-scorer-btn']");
        assert(result.total > 0, 'Score is positive for valid XPath');
        assert(result.total >= 70, 'ID-based XPath scores >= 70');
        assert(result.breakdown.attributeReliability === 35, 'ID attribute scores 35');
        assert(result.breakdown.uniqueness === 25, 'Unique element scores 25');

        assertEqual(SXG.getScoreLabel(85), 'Excellent', '85 is Excellent');
        assertEqual(SXG.getScoreLabel(65), 'Good', '65 is Good');
        assertEqual(SXG.getScoreLabel(45), 'Fair', '45 is Fair');
        assertEqual(SXG.getScoreLabel(30), 'Poor', '30 is Poor');

        testEl.remove();
    }

    // ═══════════════════════════════════════════════════════════
    // XPath Generator Tests
    // ═══════════════════════════════════════════════════════════

    function testXPathGenerator() {
        console.log('\n--- XPath Generator Tests ---');

        // Test with ID element
        var idEl = document.createElement('input');
        idEl.id = '__sxg-unittest-gen-input';
        idEl.type = 'text';
        idEl.placeholder = 'Search...';
        document.body.appendChild(idEl);

        var result = SXG.generate(idEl);
        assert(result.best !== null, 'generate returns best result');
        assert(result.best.xpath !== null, 'Best XPath is not null');
        assert(result.best.xpath.indexOf('__sxg-unittest-gen-input') !== -1, 'Best uses ID');
        assert(result.best.score > 0, 'Best has positive score');
        assert(result.reasoning.length > 0, 'Reasoning is provided');

        idEl.remove();

        // Test with class-only element
        var classEl = document.createElement('span');
        classEl.className = 'product-price currency';
        classEl.textContent = '$29.99';
        var container = document.createElement('div');
        container.id = '__sxg-unittest-container';
        container.appendChild(classEl);
        document.body.appendChild(container);

        var result2 = SXG.generate(classEl);
        assert(result2.best !== null, 'Class element gets a result');
        assert(result2.best.xpath !== null, 'Class element XPath is not null');

        container.remove();

        // Test with no attributes (text-only)
        var textEl = document.createElement('button');
        textEl.textContent = 'Add to Cart SXG Test';
        document.body.appendChild(textEl);

        var result3 = SXG.generate(textEl);
        assert(result3.best !== null, 'Text-only element gets a result');
        // Should use text-based strategy
        if (result3.best.xpath) {
            assert(result3.best.xpath.indexOf('normalize-space()') !== -1 || result3.best.xpath.indexOf('button') !== -1,
                'Text element uses text or tag-based XPath');
        }

        textEl.remove();

        // Test error handling with null
        var result4 = SXG.generate(null);
        assert(result4.best.label === 'Error', 'Null element returns error');

        // Test data-testid element
        var dataEl = document.createElement('div');
        dataEl.setAttribute('data-testid', 'sxg-unittest-hero-section');
        document.body.appendChild(dataEl);

        var result5 = SXG.generate(dataEl);
        assert(result5.best.xpath !== null, 'data-testid element gets XPath');
        assert(result5.best.xpath.indexOf('data-testid') !== -1, 'XPath uses data-testid');

        dataEl.remove();
    }

    // ═══════════════════════════════════════════════════════════
    // Run All Tests
    // ═══════════════════════════════════════════════════════════

    function runAll() {
        testDynamicDetector();
        testXPathValidator();
        testStabilityScorer();
        testXPathGenerator();
        report();
    }

    return { runAll: runAll };
})();
