# XPath Generator

A Chrome extension (Manifest V3) that generates **smart, stable, human-readable XPath selectors** for any element on a webpage — with one click. It automatically filters out dynamically-generated classes/IDs (CSS-in-JS hashes, Angular/Vue scoped attrs, auto-increment IDs, etc.), scores every candidate selector on a 0–100 stability scale, and surfaces the best option plus ranked alternatives.

Built for QA engineers, SDETs, and anyone writing XPath selectors for Selenium, Cypress, Playwright, or WebDriver-based automation.

---

## Features

- **One-click generation** — toggle selector mode, click any element, get a ranked set of XPath candidates instantly.
- **Multi-phase generation algorithm** — tries self-identifying attributes first, then ancestor-anchored paths, then positional fallbacks, only escalating when needed (see [How it works](#how-it-works)).
- **0–100 stability scoring** — each candidate is scored across five weighted factors (attribute reliability, DOM uniqueness, DOM depth, dynamic-value risk, readability) and labeled `Excellent` / `Good` / `Fair` / `Poor`.
- **Dynamic attribute detection** — pattern-based filtering rejects hashed CSS-module classes (`css-x7hF2`), styled-components classes (`sc-bdVaJa`), Angular/Vue scoped attrs (`_ngcontent-c0`, `data-v-7ba5bd90`), UUIDs, Ember IDs (`ember482`), and other auto-generated values before they're ever considered.
- **Live DOM validation** — every candidate is validated with `document.evaluate()` and checked for uniqueness before being shown to you.
- **Best / Alternative / Fallback results** — three ranked picks per click, each with its score breakdown and the strategy used to build it (e.g. *"Unique stable ID"*, *"Anchored to nav (depth 2)"*, *"Indexed child [3] within stable parent"*).
- **Visual hover highlighting** — see exactly which element you're about to select before you click.
- **Draggable results overlay** — rendered in an isolated Shadow DOM panel so it never inherits or leaks page styles.
- **Copy to clipboard** — one click copies the XPath string, ready to paste into your test code.
- **Keyboard shortcut** — `Alt+Shift+X` toggles selector mode from anywhere; `Esc` exits selector mode or closes the results panel.
- **iframe / Shadow DOM aware** — content scripts run in `all_frames`, and validator functions accept a custom context node for scoped evaluation.
- **Minimal permissions** — only `activeTab`, `scripting`, and `clipboardWrite`. No host permissions, no data collection.

---

## Installation

This extension is not yet published to the Chrome Web Store — install it from source:

1. Clone or download this repository:
   ```bash
   git clone https://github.com/<your-username>/smart-xpath-generator.git
   ```
2. Open Chrome and go to `chrome://extensions`.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the project folder (the one containing `manifest.json`).

---

## Usage

1. Click the toolbar icon and press **Enable Selector Mode**, or use **`Alt+Shift+X`**.
2. Hover over the page — the element under your cursor is outlined in blue.
3. Click the element. A panel slides in from the top-right showing:
   - **Best** match (green badge) — the highest-scoring, validated-unique selector
   - **Alternative** (blue badge) — the next best candidate
   - **Fallback** (yellow badge) — a third option, useful if the page structure changes
   - A plain-language **reasoning** summary explaining why each was chosen
4. Click **📋 Copy** on any result to copy that XPath to your clipboard.
5. Press **`Esc`** to close the results panel, or press it again (or `Alt+Shift+X`) to exit selector mode entirely.

---

## How it works

### Generation pipeline (`core/xpath-generator.js`)

For each clicked element, the generator runs three phases and stops escalating as soon as it has unique matches:

| Phase | Strategy | Examples |
|---|---|---|
| **1. Self-identification** | Build a selector from the element's own stable attributes | `//button[@id='submit-btn']`, `//input[@data-testid='email']`, `//a[contains(@class,'nav-link')]`, `//button[normalize-space()='Sign in']`, combined `@name + @type` predicates |
| **2. Ancestor anchoring** | Walk up to 5 ancestors looking for a stable anchor, then path down to the target | `//nav[@id='main-nav']//button[@aria-label='Close']`, direct-child variants |
| **3. Fallback** | Positional/structural strategies when nothing else is unique | following-sibling of a labeled element (e.g. a `<label>`), indexed child within a stable parent, global tag index (flagged as fragile), `@type + @placeholder` combos for form inputs |

Every candidate is validated against the live DOM (`document.evaluate`) and only kept if it actually resolves. If no candidate is unique, the best non-unique matches are still surfaced (with a match-count warning) rather than returning nothing.

### Dynamic attribute filtering (`core/dynamic-detector.js`)

Before any attribute or class is considered for a selector, it's checked against pattern rules that catch common auto-generated value shapes, including:

- Hashed suffixes (`-a1b2c3`), double-underscore module suffixes
- CSS-in-JS / styled-components classes (`css-x7hF2`, `sc-bdVaJa`)
- Framework-injected attributes (`_ngcontent-c0`, `_nghost-*`, `data-v-7ba5bd90`)
- UUIDs, pure-numeric IDs, Ember-generated IDs (`ember482`), Material-UI-style IDs (`:r1a:`)

`data-testid`, `data-test`, `data-cy`, `data-qa`, and similar test-targeting attributes are always treated as stable, even if their values look hash-like.

### Stability scoring (`core/stability-scorer.js`)

Each candidate XPath is scored out of 100 across five weighted components:

| Factor | Max points | What it rewards |
|---|---|---|
| Attribute reliability | 35 | `@id` scores highest, then `data-testid`/`data-cy`, then `@name`, `aria-*`, text content, `@class`, down to bare `@type` |
| Uniqueness | 25 | Whether the selector matches exactly one element on the page right now |
| DOM depth | 15 | Shorter, shallower paths score higher than deeply nested ones |
| Dynamic-value risk | 15 | Penalizes any leftover hash-like or index-based fragments |
| Readability | 10 | Rewards shorter strings, semantic HTML tags, and human-meaningful attribute names |

Total scores map to labels: **80+ Excellent · 60+ Good · 40+ Fair · below 40 Poor**.

### Validation (`core/xpath-validator.js`)

Wraps `document.evaluate()` to count matches, check uniqueness, fetch the first match, and confirm a selector resolves to the exact element that was clicked. Also includes a robust XPath string-escaping function (`escapeXPathValue`) that correctly handles values containing single quotes, double quotes, or both (via `concat()`).

---

## Project structure

```
smart-xpath-generator/
├── manifest.json                  # Chrome extension manifest (MV3)
├── background/
│   └── service-worker.js          # Handles Alt+Shift+X command, toolbar badge state
├── content/
│   ├── content.js                 # Orchestrates selector mode, hover/click/escape handling
│   ├── highlighter.js             # Hover highlight box
│   └── overlay.js                 # Shadow-DOM results panel (draggable, copy-to-clipboard)
├── core/
│   ├── dynamic-detector.js        # Pattern-based filtering of auto-generated attrs/classes
│   ├── xpath-generator.js         # 3-phase candidate generation algorithm
│   ├── stability-scorer.js        # 5-factor 0–100 scoring engine
│   └── xpath-validator.js         # document.evaluate() wrapper, uniqueness checks, escaping
├── icons/                         # Extension icons (16/32/48/128 px) + source SVG
├── popup/
│   ├── popup.html                 # Toolbar popup UI
│   ├── popup.js                   # Toggle selector mode from the popup
│   └── popup.css                  # Popup styling
└── tests/
    ├── core-tests.js              # In-browser unit tests for the core/ modules
    └── test-runner.html           # Open this file in Chrome to run the test suite
```

---

## Permissions

| Permission | Why it's needed |
|---|---|
| `activeTab` | Interact with the DOM of the tab you're currently working on |
| `scripting` | Inject the content scripts that power highlighting and selection |
| `clipboardWrite` | Copy generated XPath strings to your clipboard |

No host permissions are requested beyond the active tab, and the extension does not collect, store, or transmit any browsing data.

---

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Esc` | Exit selector mode, or close the results panel if it's open |

Customize the shortcut at `chrome://extensions/shortcuts`.

---

## Running the tests

The test suite is dependency-free and runs directly in the browser:

1. Open `tests/test-runner.html` in Chrome (e.g. drag it into a tab, or `file://` it).
2. Test results print to the page and to the DevTools console, covering the dynamic detector and core generation logic.

---

## Known limitations / in-progress

- Clipboard copy in `overlay.js` currently calls `navigator.clipboard.writeText()` directly from the Shadow DOM panel; an alternate custom-event-based copy flow (for stricter CSP pages) is present in the code but currently commented out in both `content.js` and `overlay.js`.
- The global-index fallback strategy (`(//tag)[n]`) is intentionally labeled "fragile" in its own output — it's a last resort and not recommended for selectors used in CI test suites.
- Ancestor anchoring is capped at 5 levels (`MAX_ANCESTOR_DEPTH`) to keep generated XPaths reasonably short.

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes (and add/update tests in `tests/core-tests.js` where applicable)
4. Open `tests/test-runner.html` to confirm everything still passes
5. Commit, push, and open a Pull Request
