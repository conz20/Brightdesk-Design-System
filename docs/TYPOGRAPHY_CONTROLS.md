# Brightdesk typography controls

## Purpose

Brightdesk-Design-System owns the shared, framework-neutral typography controls used by the ten Brightdesk products. The component is a local UI layer; it does not enumerate the operating system, read font files, install fonts, or make network requests.

## Current font-discovery contract

The picker accepts normalized local collections from Brightdesk-Type-Preview's `discoverSystemFonts(adapter)` API or the approved Brightdesk-Fonts catalogue adapter:

- `source` must be `system`, `bundled`, `catalogue` or `combined`;
- `families` is an array of family records;
- each family has its exact OS-reported `familyName` and one or more `faces`;
- each face carries `faceName`, `style`, numeric `weight`, `italic`, `oblique`, and optional variable `axes`.

The picker preserves exact original family and face names (including bundled names such as `Inter`), merges repeated family records case-insensitively without dropping distinct faces, and leaves Microsoft fonts such as Aptos and Segoe UI available whenever they are installed locally. It exposes the installed face list for the chosen family and creates range controls for the face's declared variable axes. It does not bundle or redistribute proprietary font binaries. The normalizer preserves exact family, face and PostScript names as supplied; it does not trim them. It accepts only the documented collection, family, face and axis properties, rejecting paths, checksums, download URLs and other unapproved metadata. Axis tags must be unique, ranges must be finite and ordered, and a declared `wght` default must match the face weight. Optional script and language lists preserve their exact values and reject blanks or duplicates.

### Font availability and optional downloads

Each catalogue family can include:
- `availability: "ready"` when the approved font files are already installed locally;
- `availability: "download-required"` when its package is listed but has not yet been downloaded;
- `packageId` and `version` for a `download-required` family. These are opaque Brightdesk package identifiers, never arbitrary URLs or filesystem paths.

The `catalogue` source defaults families to `download-required`; it must provide a safe `packageId` and `version`. The picker displays the family in the same alphabetical list with a **Download required** label. Until the local font package has been verified and installed, the face selector, typography controls and live preview stay disabled for that family. When combining catalogue records with installed system or bundled fonts, the locally installed records take precedence and only their installed faces are exposed as ready.

The picker delegates a user-triggered request through the optional `onDownload({ familyName, packageId, version })` callback. The host application must route this request through Brightdesk's controlled product-update channel. The picker never makes a network request, accepts a remote URL, or writes font files. The host must validate the signed package manifest, licence/redistribution records, SHA-256 hashes and version before installation. After successful local installation, the host returns a fresh `bundled`/`combined` collection to the callback, or calls `setCollection()` with that refreshed local collection. The picker then makes the installed faces available. Downloads are explicit; downloaded fonts remain usable offline. Always recommend downloading updates in advance for the fastest local use.

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
  },
  onDownload(request) {
    // Delegate to Brightdesk's signed, controlled font-update service.
    // Resolve with a fresh local collection only after verification and installation.
    return brightdeskFontUpdates.downloadAndInstall(request);
  }
});

container.append(picker.element);
```

The consumer obtains `platformAdapter` and `discoverSystemFonts` from Brightdesk-Type-Preview. The picker is not responsible for selecting or launching native helpers.

`createFontPicker()` returns:
- `element`: accessible DOM section containing font family, point size, weight, italic and specimen controls;
- `getValue()`: current `{ familyName, faceName, fontSizePt, weight, style, axes, text }` selection. Variable `wght` is represented by `weight` and included in `axes` when declared; other declared axes receive labelled sliders and are applied to the local preview;
- `setValue(value)`: update the selected control values and emit `onChange`;
- `getAvailability()`: report whether the selected family is `ready`, `download-required` or `none`;
- `setCollection(collection)`: replace catalogue/local font metadata while retaining the chosen family where possible. Newly installed families become usable only when the replacement collection confirms their local availability.

When the local collection is empty, the control shows “No installed fonts were found” and disables typography inputs rather than inventing a fallback font. A catalogue-only family remains visible but its face and editing controls stay disabled until its verified font package is installed locally.

## Accessibility and privacy

Family and installed-face selectors, point size, weight, italic and each available variable-axis slider have programmatic labels, native keyboard behaviour and visible focus styles. The preview and availability status announce changes politely. The component does not include remote font search, telemetry, cloud caching, a hosted preview service, document upload, direct network access or font-file installation. System-font discovery must remain read-only. The host-controlled updater owns package download, signature/licence/hash verification and local installation.

## Verification

Run `npm run verify` with Node.js **24.22.2**. The test suite covers metadata normalization, preservation of Microsoft family names, duplicate family handling, invalid metadata rejection, CSS-family escaping, accessible labels, installed-face selection, variable-axis updates, preserving/clamping selections after a local catalogue refresh, catalogue-only font availability, download gating, Brightdesk update callback handling, local-ready precedence, live preview updates and the empty state.

The component is a shared foundation only. Product integrations, OS-native builds, real desktop rendering, assistive-technology checks, international-script shaping and full Windows/macOS/Linux verification remain separate acceptance gates.
