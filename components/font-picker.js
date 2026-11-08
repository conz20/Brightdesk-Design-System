const VALID_STYLES = new Set(['normal', 'italic', 'oblique']);
const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 96;
const DEFAULT_SPECIMEN = 'The quick brown fox jumps over the lazy dog.';

function fail(message) {
  throw new TypeError('Brightdesk Design System: ' + message);
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireText(value, label) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    fail(label + ' must be a non-empty string.');
  }
  return value.trim();
}

function faceKey(face) {
  return JSON.stringify([
    face.faceName,
    face.postScriptName || '',
    face.style,
    face.weight,
    face.italic,
    face.oblique,
    face.axes || [],
    face.scripts || [],
    face.languages || []
  ]);
}

/**
 * Convert Brightdesk-Type-Preview's normalized local system-font collection
 * into the stable family list consumed by shared typography controls.
 * Exact OS-reported family and face names are preserved. Repeated family
 * records are coalesced without discarding their distinct installed faces.
 */
export function normalizeFontFamilies(collection) {
  if (!isRecord(collection) || collection.source !== 'system' || !Array.isArray(collection.families)) {
    fail('collection must be a normalized local system-font collection.');
  }

  const byName = new Map();
  for (const [familyIndex, family] of collection.families.entries()) {
    if (!isRecord(family)) fail('families[' + familyIndex + '] must be an object.');
    const familyName = requireText(family.familyName, 'families[' + familyIndex + '].familyName');
    if (!Array.isArray(family.faces) || family.faces.length === 0) {
      fail('families[' + familyIndex + '].faces must contain at least one installed face.');
    }

    const key = familyName.toLocaleLowerCase('en-US');
    let normalized = byName.get(key);
    if (!normalized) {
      normalized = { familyName, faces: [], _faceKeys: new Set() };
      byName.set(key, normalized);
    }

    for (const [faceIndex, face] of family.faces.entries()) {
      const label = 'families[' + familyIndex + '].faces[' + faceIndex + ']';
      if (!isRecord(face)) fail(label + ' must be an object.');
      const faceName = requireText(face.faceName, label + '.faceName');
      if (
        !VALID_STYLES.has(face.style) ||
        !Number.isInteger(face.weight) ||
        face.weight < 1 ||
        face.weight > 1000 ||
        typeof face.italic !== 'boolean' ||
        typeof face.oblique !== 'boolean'
      ) {
        fail(label + ' has invalid style or weight metadata.');
      }
      if (
        (face.style === 'normal' && (face.italic || face.oblique)) ||
        (face.style === 'italic' && (!face.italic || face.oblique)) ||
        (face.style === 'oblique' && (face.italic || !face.oblique))
      ) {
        fail(label + ' has contradictory style flags.');
      }

      const axes = face.axes === undefined ? [] : face.axes;
      if (!Array.isArray(axes)) fail(label + '.axes must be an array.');
      const normalizedFace = {
        faceName,
        style: face.style,
        weight: face.weight,
        italic: face.italic,
        oblique: face.oblique,
        axes: axes.map(axis => {
          if (
            !isRecord(axis) ||
            typeof axis.tag !== 'string' ||
            !/^[A-Za-z0-9]{4}$/.test(axis.tag) ||
            ![axis.min, axis.default, axis.max].every(Number.isFinite) ||
            axis.min > axis.default ||
            axis.default > axis.max
          ) {
            fail(label + '.axes contains invalid OpenType axis metadata.');
          }
          return { tag: axis.tag, min: axis.min, default: axis.default, max: axis.max };
        })
      };
      if (face.postScriptName !== undefined) {
        normalizedFace.postScriptName = requireText(face.postScriptName, label + '.postScriptName');
      }
      if (face.scripts !== undefined) {
        if (!Array.isArray(face.scripts) || face.scripts.some(value => typeof value !== 'string')) {
          fail(label + '.scripts must be an array of strings.');
        }
        normalizedFace.scripts = [...face.scripts];
      }
      if (face.languages !== undefined) {
        if (!Array.isArray(face.languages) || face.languages.some(value => typeof value !== 'string')) {
          fail(label + '.languages must be an array of strings.');
        }
        normalizedFace.languages = [...face.languages];
      }

      const signature = faceKey(normalizedFace);
      if (!normalized._faceKeys.has(signature)) {
        normalized._faceKeys.add(signature);
        normalized.faces.push(normalizedFace);
      }
    }
  }

  return [...byName.values()]
    .map(({ familyName, faces }) => ({
      familyName,
      faces: faces.sort((a, b) => a.style.localeCompare(b.style) || a.weight - b.weight || a.faceName.localeCompare(b.faceName))
    }))
    .sort((a, b) => a.familyName.localeCompare(b.familyName, 'en', { sensitivity: 'base' }));
}

/** Safely quote an OS-reported family name for a CSS font-family declaration. */
export function escapeFontFamily(familyName) {
  requireText(familyName, 'familyName');
  const escaped = [...familyName.trim()].map(character => {
    const code = character.codePointAt(0);
    if (character === '"' || character === '\\') return '\\' + character;
    if (code === 0) return '\\fffd ';
    if (code < 0x20 || code === 0x7f) return '\\' + code.toString(16) + ' ';
    return character;
  }).join('');
  return '"' + escaped + '", sans-serif';
}

function createElement(document, tagName, className, controlName) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (controlName) element.dataset.control = controlName;
  return element;
}

function createLabel(document, labelText, control, className) {
  const label = createElement(document, 'label', className);
  const caption = createElement(document, 'span');
  caption.textContent = labelText;
  control.setAttribute('aria-label', labelText);
  label.append(caption, control);
  return label;
}

function boundedInteger(rawValue, minimum, maximum, fallback) {
  const number = Number(rawValue);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.round(number)));
}

/**
 * Create a framework-neutral, accessible font-picker control group.
 *
 * Pass a normalized collection from Brightdesk-Type-Preview's
 * discoverSystemFonts() API. This component only consumes local metadata;
 * it performs no font discovery, file access, installation or network calls.
 */
export function createFontPicker({
  document,
  collection,
  initialValue = {},
  onChange
} = {}) {
  if (!document || typeof document.createElement !== 'function') {
    fail('a document with createElement() is required.');
  }
  if (onChange !== undefined && typeof onChange !== 'function') {
    fail('onChange must be a function when provided.');
  }
  if (!isRecord(initialValue)) fail('initialValue must be an object.');

  let families = normalizeFontFamilies(collection === undefined
    ? { source: 'system', families: [] }
    : collection);

  const root = createElement(document, 'section', 'bd-font-picker');
  root.setAttribute('aria-label', 'Typography controls');

  const controls = createElement(document, 'div', 'bd-font-picker__controls');
  const familySelect = createElement(document, 'select', 'bd-font-picker__family', 'family');
  const faceSelect = createElement(document, 'select', 'bd-font-picker__face', 'face');
  const axisControls = createElement(document, 'div', 'bd-font-picker__axes', 'axes');
  const sizeInput = createElement(document, 'input', 'bd-font-picker__size', 'size');
  sizeInput.type = 'number';
  sizeInput.min = String(MIN_FONT_SIZE);
  sizeInput.max = String(MAX_FONT_SIZE);
  sizeInput.step = '1';

  const weightInput = createElement(document, 'input', 'bd-font-picker__weight', 'weight');
  weightInput.type = 'number';
  weightInput.min = '1';
  weightInput.max = '1000';
  weightInput.step = '1';

  const italicInput = createElement(document, 'input', 'bd-font-picker__italic', 'italic');
  italicInput.type = 'checkbox';

  const specimenInput = createElement(document, 'input', 'bd-font-picker__specimen', 'specimen');
  specimenInput.type = 'text';
  specimenInput.maxLength = 240;

  const preview = createElement(document, 'p', 'bd-font-picker__preview', 'preview');
  preview.setAttribute('role', 'region');
  preview.setAttribute('aria-label', 'Font preview');
  preview.setAttribute('aria-live', 'polite');

  controls.append(
    createLabel(document, 'Font family', familySelect, 'bd-font-picker__field bd-font-picker__field--family'),
    createLabel(document, 'Installed font face', faceSelect, 'bd-font-picker__field bd-font-picker__field--face'),
    createLabel(document, 'Font size (points)', sizeInput, 'bd-font-picker__field'),
    createLabel(document, 'Font weight', weightInput, 'bd-font-picker__field'),
    createLabel(document, 'Italic', italicInput, 'bd-font-picker__field bd-font-picker__field--checkbox')
  );
  root.append(
    controls,
    axisControls,
    createLabel(document, 'Preview text', specimenInput, 'bd-font-picker__specimen-field'),
    preview
  );

  let axisInputs = new Map();

  function selectedFamily() {
    return families.find(family => family.familyName === familySelect.value) || null;
  }

  function selectedFace() {
    const family = selectedFamily();
    if (!family || faceSelect.value === '') return null;
    return family.faces[Number(faceSelect.value)] || null;
  }

  function currentValue() {
    const face = selectedFace();
    const weightAxis = face && face.axes.find(axis => axis.tag === 'wght');
    const minimumWeight = weightAxis ? Math.ceil(weightAxis.min) : 1;
    const maximumWeight = weightAxis ? Math.floor(weightAxis.max) : 1000;
    const weight = boundedInteger(weightInput.value, minimumWeight, maximumWeight, face ? face.weight : 400);
    const axes = {};
    if (weightAxis) axes.wght = weight;
    for (const [tag, input] of axisInputs) axes[tag] = Number(input.value);

    return {
      familyName: familySelect.value,
      faceName: face ? face.faceName : '',
      fontSizePt: boundedInteger(sizeInput.value, MIN_FONT_SIZE, MAX_FONT_SIZE, 12),
      weight,
      style: italicInput.checked ? 'italic' : (face && face.style === 'oblique' ? 'oblique' : 'normal'),
      axes,
      text: specimenInput.value
    };
  }

  function axisLabel(tag) {
    const labels = {
      wdth: 'Width',
      opsz: 'Optical size',
      slnt: 'Slant',
      ital: 'Italic axis',
      GRAD: 'Grade'
    };
    return labels[tag] || tag;
  }

  function renderAxisControls(face, preferredAxes = {}) {
    axisControls.replaceChildren();
    axisInputs = new Map();
    const axes = face ? face.axes : [];
    const weightAxis = axes.find(axis => axis.tag === 'wght');
    weightInput.min = String(weightAxis ? Math.ceil(weightAxis.min) : 1);
    weightInput.max = String(weightAxis ? Math.floor(weightAxis.max) : 1000);
    weightInput.step = '1';

    for (const axis of axes) {
      if (axis.tag === 'wght') continue;
      const label = createElement(document, 'label', 'bd-font-picker__axis-field');
      const caption = createElement(document, 'span');
      caption.textContent = axisLabel(axis.tag) + ' (' + axis.tag + ')';
      const input = createElement(document, 'input', 'bd-font-picker__axis', 'axis-' + axis.tag.toLowerCase());
      input.type = 'range';
      input.min = String(axis.min);
      input.max = String(axis.max);
      input.step = 'any';
      const requested = preferredAxes[axis.tag] === undefined ? axis.default : preferredAxes[axis.tag];
      const numeric = Number(requested);
      input.value = String(Number.isFinite(numeric) ? Math.min(axis.max, Math.max(axis.min, numeric)) : axis.default);
      input.setAttribute('aria-label', caption.textContent);
      label.append(caption, input);
      axisControls.append(label);
      axisInputs.set(axis.tag, input);
      input.addEventListener('input', update);
    }
    axisControls.hidden = axisInputs.size === 0;
  }

  function rebuildFaceOptions(preferred = {}) {
    faceSelect.replaceChildren();
    const family = selectedFamily();
    if (!family) {
      faceSelect.disabled = true;
      renderAxisControls(null);
      return;
    }

    for (const [index, face] of family.faces.entries()) {
      const option = createElement(document, 'option');
      option.value = String(index);
      option.textContent = face.faceName;
      faceSelect.append(option);
    }

    const preferredIndex = family.faces.findIndex(face =>
      (preferred.faceName && face.faceName === preferred.faceName) &&
      (!preferred.style || face.style === preferred.style) &&
      (preferred.weight === undefined || face.weight === preferred.weight)
    );
    const styleWeightIndex = family.faces.findIndex(face =>
      (!preferred.style || face.style === preferred.style) &&
      (preferred.weight === undefined || face.weight === preferred.weight)
    );
    const selectedIndex = preferredIndex >= 0
      ? preferredIndex
      : (styleWeightIndex >= 0 ? styleWeightIndex : 0);
    faceSelect.disabled = false;
    faceSelect.value = String(selectedIndex);

    const face = selectedFace();
    if (preferred.weight === undefined) weightInput.value = String(face.weight);
    if (preferred.style === undefined) italicInput.checked = face.italic;
    renderAxisControls(face, preferred.axes || {});
  }

  function rebuildFamilyOptions(preferredFamily, preferred = {}) {
    familySelect.replaceChildren();
    for (const family of families) {
      const option = createElement(document, 'option');
      option.value = family.familyName;
      option.textContent = family.familyName;
      familySelect.append(option);
    }

    if (families.length === 0) {
      const option = createElement(document, 'option');
      option.value = '';
      option.textContent = 'No installed fonts found';
      familySelect.append(option);
      familySelect.value = '';
      familySelect.disabled = true;
      faceSelect.replaceChildren();
      faceSelect.disabled = true;
      renderAxisControls(null);
      return;
    }

    familySelect.disabled = false;
    const selected = families.find(family => family.familyName === preferredFamily) || families[0];
    familySelect.value = selected.familyName;
    rebuildFaceOptions(preferred);
  }

  function updateInitialAxisWeight() {
    const face = selectedFace();
    const weightAxis = face && face.axes.find(axis => axis.tag === 'wght');
    if (weightAxis && initialValue.weight === undefined) {
      weightInput.value = String(weightAxis.default);
    }
  }

  function apply(emitChange = true) {
    const value = currentValue();
    const hasFamily = Boolean(value.familyName);
    for (const control of [faceSelect, sizeInput, weightInput, italicInput, specimenInput]) {
      control.disabled = !hasFamily;
    }

    if (!hasFamily) {
      preview.textContent = 'No installed fonts were found.';
      preview.style.fontFamily = '';
      preview.style.fontSize = '';
      preview.style.fontWeight = '';
      preview.style.fontStyle = '';
      preview.style.fontVariationSettings = 'normal';
      return;
    }

    preview.style.fontFamily = escapeFontFamily(value.familyName);
    preview.style.fontSize = (value.fontSizePt * 4 / 3) + 'px';
    preview.style.fontWeight = String(value.weight);
    preview.style.fontStyle = value.style;
    const variationSettings = Object.entries(value.axes)
      .filter(([tag]) => tag !== 'wght')
      .map(([tag, amount]) => '"' + tag + '" ' + amount)
      .join(', ');
    preview.style.fontVariationSettings = variationSettings || 'normal';
    preview.textContent = value.text;
    if (emitChange && onChange) onChange(value);
  }

  function update() {
    const face = selectedFace();
    const weightAxis = face && face.axes.find(axis => axis.tag === 'wght');
    const minimumWeight = weightAxis ? Math.ceil(weightAxis.min) : 1;
    const maximumWeight = weightAxis ? Math.floor(weightAxis.max) : 1000;
    weightInput.value = String(boundedInteger(weightInput.value, minimumWeight, maximumWeight, face ? face.weight : 400));
    apply(true);
  }

  function handleFaceChange() {
    const face = selectedFace();
    if (face) {
      weightInput.value = String(face.weight);
      italicInput.checked = face.italic;
      renderAxisControls(face);
    } else {
      renderAxisControls(null);
    }
    update();
  }

  familySelect.addEventListener('change', () => {
    rebuildFaceOptions();
    update();
  });
  faceSelect.addEventListener('change', handleFaceChange);
  sizeInput.addEventListener('input', update);
  weightInput.addEventListener('input', update);
  italicInput.addEventListener('change', update);
  specimenInput.addEventListener('input', update);

  const initialFamily = typeof initialValue.familyName === 'string'
    ? initialValue.familyName
    : families[0] && families[0].familyName;
  sizeInput.value = String(boundedInteger(initialValue.fontSizePt === undefined ? 12 : initialValue.fontSizePt, MIN_FONT_SIZE, MAX_FONT_SIZE, 12));
  specimenInput.value = typeof initialValue.text === 'string' ? initialValue.text.slice(0, 240) : DEFAULT_SPECIMEN;
  rebuildFamilyOptions(initialFamily, {
    faceName: initialValue.faceName,
    style: initialValue.style === undefined ? 'normal' : initialValue.style,
    weight: initialValue.weight === undefined ? 400 : initialValue.weight,
    axes: initialValue.axes
  });
  if (initialValue.weight !== undefined) weightInput.value = String(initialValue.weight);
  if (initialValue.style !== undefined) {
    italicInput.checked = initialValue.style === 'italic';
  } else if (initialValue.italic !== undefined) {
    italicInput.checked = initialValue.italic === true;
  } else {
    italicInput.checked = Boolean(selectedFace() && selectedFace().italic);
  }
  updateInitialAxisWeight();
  apply(false);

  return {
    element: root,
    getValue: currentValue,
    setCollection(nextCollection) {
      const previous = currentValue();
      families = normalizeFontFamilies(nextCollection);
      rebuildFamilyOptions(previous.familyName, previous);
      apply(false);
      return currentValue();
    },
    setValue(nextValue) {
      if (!isRecord(nextValue)) fail('setValue() expects an object.');
      const preferredFamily = nextValue.familyName === undefined ? familySelect.value : nextValue.familyName;
      const preferredFace = nextValue.faceName === undefined ? currentValue().faceName : nextValue.faceName;
      const preferredStyle = nextValue.style === undefined ? currentValue().style : nextValue.style;
      const preferredWeight = nextValue.weight === undefined ? currentValue().weight : nextValue.weight;
      const preferredAxes = nextValue.axes === undefined ? currentValue().axes : nextValue.axes;
      if (nextValue.fontSizePt !== undefined) sizeInput.value = String(nextValue.fontSizePt);
      if (nextValue.text !== undefined) specimenInput.value = String(nextValue.text).slice(0, 240);
      rebuildFamilyOptions(preferredFamily, {
        faceName: preferredFace,
        style: preferredStyle,
        weight: preferredWeight,
        axes: preferredAxes
      });
      weightInput.value = String(preferredWeight);
      italicInput.checked = preferredStyle === 'italic';
      update();
      return currentValue();
    }
  };
}
