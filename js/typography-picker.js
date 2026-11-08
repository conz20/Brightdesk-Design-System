(function attachTypographyPicker(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BrightdeskTypographyPicker = api;
})(typeof globalThis === 'object' ? globalThis : this, function createTypographyPickerModule() {
  'use strict';

  const MAX_FAMILIES = 5000;
  const MAX_FAMILY_NAME_LENGTH = 256;
  const DEFAULT_SIZE = 11;
  const ALLOWED_SIZES = Object.freeze([
    8, 9, 10, 10.5, 11, 12, 13, 14, 16, 18, 20, 22, 24, 26, 28, 32, 36, 48, 72
  ]);
  const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

  function cleanFamilyName(value) {
    if (typeof value !== 'string') return null;
    if (value.length === 0 || value.length > MAX_FAMILY_NAME_LENGTH) return null;
    if (value.trim().length === 0 || CONTROL_CHARACTERS.test(value)) return null;
    return value;
  }

  /**
   * Accept only family names supplied by the local native system-font
   * collector. The OS spelling is retained; comparisons are case-insensitive.
   */
  function normalizeInstalledFontFamilies(input) {
    if (!Array.isArray(input)) return [];
    const unique = new Map();

    for (const item of input.slice(0, MAX_FAMILIES * 4)) {
      const candidate = typeof item === 'string' ? item : item?.familyName;
      const name = cleanFamilyName(candidate);
      if (!name) continue;
      const key = name.trim().toLocaleLowerCase('en-US');
      if (!unique.has(key)) unique.set(key, name);
      if (unique.size >= MAX_FAMILIES) break;
    }

    return [...unique.values()].sort((left, right) =>
      left.localeCompare(right, 'en', { sensitivity: 'base' })
    );
  }

  function normalizeTypographySize(value) {
    const number = typeof value === 'string' && value.trim() !== ''
      ? Number(value)
      : value;
    if (typeof number !== 'number' || !Number.isFinite(number)) return DEFAULT_SIZE;
    return ALLOWED_SIZES.includes(number) ? number : DEFAULT_SIZE;
  }

  /** Escape an untrusted OS font name as one CSS string token. */
  function escapeCssFamilyName(value) {
    const name = cleanFamilyName(value);
    if (!name) return '';
    let escaped = '';
    for (const character of name) {
      const code = character.codePointAt(0);
      if (character === '\\' || character === '"') {
        escaped += '\\' + character;
      } else if (code <= 0x1f || code === 0x7f) {
        escaped += '\\' + code.toString(16) + ' ';
      } else {
        escaped += character;
      }
    }
    return '"' + escaped + '"';
  }

  function buildTypographyPickerModel(options = {}) {
    const families = normalizeInstalledFontFamilies(options.families);
    const requested = cleanFamilyName(options.fontFamily) || '';
    const match = requested
      ? families.find(name => name.toLocaleLowerCase('en-US') === requested.toLocaleLowerCase('en-US'))
      : null;

    return {
      families,
      selectedFamily: match || '',
      unavailableFamily: requested && !match ? requested : '',
      fontSize: normalizeTypographySize(options.fontSize)
    };
  }

  function createElement(documentRef, tagName, className, text) {
    const element = documentRef.createElement(tagName);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function createTypographyPicker(container, options = {}) {
    if (!container || typeof container.appendChild !== 'function' || !container.ownerDocument) {
      throw new TypeError('A DOM container is required to create the typography picker.');
    }

    const documentRef = container.ownerDocument;
    const rootElement = createElement(documentRef, 'section', 'bd-typography-picker');
    rootElement.setAttribute('aria-label', 'Typography settings');

    const fontField = createElement(documentRef, 'label', 'bd-typography-picker__field');
    const fontLabel = createElement(documentRef, 'span', 'bd-typography-picker__label', 'Font');
    const fontSelect = createElement(documentRef, 'select', 'bd-typography-picker__select');
    fontSelect.setAttribute('aria-label', 'Font family');
    fontSelect.name = 'fontFamily';

    const sizeField = createElement(documentRef, 'label', 'bd-typography-picker__field bd-typography-picker__field--size');
    const sizeLabel = createElement(documentRef, 'span', 'bd-typography-picker__label', 'Size');
    const sizeSelect = createElement(documentRef, 'select', 'bd-typography-picker__select bd-typography-picker__size');
    sizeSelect.setAttribute('aria-label', 'Font size');
    sizeSelect.name = 'fontSize';

    const preview = createElement(documentRef, 'span', 'bd-typography-picker__preview', options.specimen || 'The quick brown fox jumps over the lazy dog.');
    preview.setAttribute('role', 'status');
    preview.setAttribute('aria-label', 'Typography preview');

    fontField.append(fontLabel, fontSelect);
    sizeField.append(sizeLabel, sizeSelect);
    rootElement.append(fontField, sizeField, preview);
    container.appendChild(rootElement);

    let model = buildTypographyPickerModel(options);
    let onChange = typeof options.onChange === 'function' ? options.onChange : () => {};

    function renderFamilies() {
      fontSelect.replaceChildren();
      const systemOption = createElement(documentRef, 'option', '', 'System default');
      systemOption.value = '';
      fontSelect.appendChild(systemOption);

      if (model.unavailableFamily) {
        const unavailable = createElement(
          documentRef,
          'option',
          '',
          model.unavailableFamily + ' (not installed)'
        );
        unavailable.value = model.unavailableFamily;
        unavailable.disabled = true;
        fontSelect.appendChild(unavailable);
      }

      for (const familyName of model.families) {
        const option = createElement(documentRef, 'option', '', familyName);
        option.value = familyName;
        fontSelect.appendChild(option);
      }
      fontSelect.value = model.unavailableFamily || model.selectedFamily || '';
    }

    function renderSizes() {
      sizeSelect.replaceChildren();
      for (const size of ALLOWED_SIZES) {
        const option = createElement(documentRef, 'option', '', String(size));
        option.value = String(size);
        sizeSelect.appendChild(option);
      }
      sizeSelect.value = String(model.fontSize);
    }

    function renderPreview() {
      const family = fontSelect.value;
      preview.style.fontFamily = family
        ? escapeCssFamilyName(family) + ', sans-serif'
        : '';
      preview.style.fontSize = model.fontSize + 'pt';
    }

    function getValue() {
      const family = fontSelect.value;
      return {
        fontFamily: model.families.includes(family) ? family : '',
        fontSize: model.fontSize
      };
    }

    function emitChange() {
      renderPreview();
      onChange(getValue());
    }

    function update(nextOptions = {}) {
      const merged = {
        families: Object.prototype.hasOwnProperty.call(nextOptions, 'families')
          ? nextOptions.families
          : model.families,
        fontFamily: Object.prototype.hasOwnProperty.call(nextOptions, 'fontFamily')
          ? nextOptions.fontFamily
          : getValue().fontFamily || model.unavailableFamily,
        fontSize: Object.prototype.hasOwnProperty.call(nextOptions, 'fontSize')
          ? nextOptions.fontSize
          : model.fontSize
      };
      if (Object.prototype.hasOwnProperty.call(nextOptions, 'specimen')) {
        preview.textContent = typeof nextOptions.specimen === 'string'
          ? nextOptions.specimen
          : '';
      }
      if (typeof nextOptions.onChange === 'function') onChange = nextOptions.onChange;
      model = buildTypographyPickerModel(merged);
      renderFamilies();
      renderSizes();
      renderPreview();
      return getValue();
    }

    fontSelect.addEventListener('change', emitChange);
    sizeSelect.addEventListener('change', () => {
      model.fontSize = normalizeTypographySize(sizeSelect.value);
      emitChange();
    });

    renderFamilies();
    renderSizes();
    renderPreview();

    return {
      element: rootElement,
      getValue,
      update,
      destroy() {
        rootElement.remove();
      }
    };
  }

  return {
    ALLOWED_SIZES,
    buildTypographyPickerModel,
    createTypographyPicker,
    escapeCssFamilyName,
    normalizeInstalledFontFamilies,
    normalizeTypographySize
  };
});
