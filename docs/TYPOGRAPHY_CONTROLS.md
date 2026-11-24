# Brightdesk typography controls

## Purpose

Brightdesk-Design-System owns the shared, framework-neutral typography controls used by the ten Brightdesk products. The component is a local UI layer; it does not enumerate the operating system, read font files, install fonts, or make network requests.

## Current font-discovery contract

The picker accepts normalized local collections from Brightdesk-Type-Preview's `discoverSystemFonts(adapter)` API or the approved Brightdesk-Fonts catalogue adapter:

- `source` must be `system`, `bundled` or `combined`;
- `families` is an array of family records;
- each family has its exact OS-reported `familyName` and one or more `faces`;
- each face carries `faceName`, `style`, numeric `weight`, `italic`, `oblique`, and optional variable `axes`.

The picker preserves exact original family and face names (including bundled names such as `Inter`), merges repeated family records case-insensitively without dropping distinct faces, and leaves Microsoft fonts such as Aptos and Segoe UI available whenever they are installed locally. It exposes the installed face list for the chosen family and creates range controls for the face's declared variable axes. It does not bundle or redistribute proprietary font binaries.

## API

```js
import { createFontPicker } from './components/font-picker.js';
import './css/tokens.css';
import './css/font-picker.css';

const systemFonts = await discoverSystemFonts(platformAdapter);

const picker = createFontPicker({
  document,
  collection: systemFonts,
  initialValue: {
    familyName: 'Aptos',
    faceName: 'Aptos',
    fontSizePt: 12,
    weight: 400,
    style: 'normal',
    axes: {},
    text: 'The quick brown fox jumps over the lazy dog.'
  },
  onChange(value) {
    // Apply the selected typography to the active product editor.
    // Keep document content local; do not send it to a service.
  }
});

container.append(picker.element);
```

The consumer obtains `platformAdapter` and `discoverSystemFonts` from Brightdesk-Type-Preview. The picker is not responsible for selecting or launching native helpers.

`createFontPicker()` returns:
- `element`: accessible DOM section containing font family, point size, weight, italic and specimen controls;
- `getValue()`: current `{ familyName, faceName, fontSizePt, weight, style, axes, text }` selection. Variable `wght` is represented by `weight` and included in `axes` when declared; other declared axes receive labelled sliders and are applied to the local preview;
- `setValue(value)`: update the selected control values and emit `onChange`;
- `setCollection(collection)`: replace the local installed-font list while retaining the chosen family where possible.

When the local collection is empty, the control shows “No installed fonts were found” and disables typography inputs rather than inventing a fallback font.

## Accessibility and privacy

Family and installed-face selectors, point size, weight, italic and each available variable-axis slider have programmatic labels, native keyboard behaviour and visible focus styles. The preview region announces changes politely. The component does not include remote font search, telemetry, cloud caching, a hosted preview service, document upload or font installation. System-font discovery must remain read-only.

## Verification

Run `npm run verify` with Node.js **24.22.2**. The test suite covers metadata normalization, preservation of Microsoft family names, duplicate family handling, invalid metadata rejection, CSS-family escaping, accessible labels, installed-face selection, variable-axis updates, preserving/clamping selections after a local catalogue refresh, live preview updates and the empty state.

The component is a shared foundation only. Product integrations, OS-native builds, real desktop rendering, assistive-technology checks, international-script shaping and full Windows/macOS/Linux verification remain separate acceptance gates.
