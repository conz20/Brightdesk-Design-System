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
  return value;
}

function requireAllowedKeys(value, allowed, label) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) fail(label + ' contains unsupported property: ' + key + '.');
  }
}

function normalizeStringList(value, label) {
  if (!Array.isArray(value)) fail(label + ' must be an array of strings.');
  const seen = new Set();
  return value.map((item, index) => {
    const exact = requireText(item, label + '[' + index + ']');
    if (seen.has(exact)) fail('duplicate values in ' + label + '.');
    seen.add(exact);
    return exact;
  });
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
function normalizePackageIdentity(value, label, pattern) {
  const exact = requireText(value, label);
  if (!pattern.test(exact)) fail(label + ' contains unsupported characters.');
  return exact;
}

/**
 * Normalize local system, bundled and Brightdesk catalogue font records.
 * Catalogue-only families remain visible but carry no usable face until their
 * Brightdesk package has been downloaded, verified and installed locally.
 */
export function normalizeFontFamilies(collection) {
  if (!isRecord(collection) || !['system', 'bundled', 'catalogue', 'combined'].includes(collection.source) || !Array.isArray(collection.families)) {
    fail('collection must be a normalized system, bundled, catalogue or combined font collection.');
  }
  requireAllowedKeys(collection, ['source', 'platform', 'provider', 'families'], 'collection');

  const byName = new Map();
  for (const [familyIndex, family] of collection.families.entries()) {
    if (!isRecord(family)) fail('families[' + familyIndex + '] must be an object.');
    requireAllowedKeys(family, ['familyName', 'faces', 'availability', 'packageId', 'version'], 'families[' + familyIndex + ']');
    const familyName = requireText(family.familyName, 'families[' + familyIndex + '].familyName');
    const availability = family.availability || (collection.source === 'catalogue' ? 'download-required' : 'ready');
    if (!['ready', 'download-required'].includes(availability)) {
      fail('families[' + familyIndex + '].availability must be ready or download-required.');
    }
    if (['system', 'bundled'].includes(collection.source) && availability !== 'ready') {
      fail('local system and bundled fonts cannot require a download.');
    }
    let packageId;
    let version;
    if (availability === 'download-required') {
      packageId = normalizePackageIdentity(family.packageId, 'families[' + familyIndex + '].packageId', /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/);
      version = normalizePackageIdentity(family.version, 'families[' + familyIndex + '].version', /^[A-Za-z0-9][A-Za-z0-9._+-]{0,79}$/);
    } else if (family.packageId !== undefined || family.version !== undefined) {
      packageId = normalizePackageIdentity(family.packageId, 'families[' + familyIndex + '].packageId', /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/);
      version = normalizePackageIdentity(family.version, 'families[' + familyIndex + '].version', /^[A-Za-z0-9][A-Za-z0-9._+-]{0,79}$/);
    }
    if (!Array.isArray(family.faces) || family.faces.length === 0) {
      fail('families[' + familyIndex + '].faces must contain at least one face record.');
    }

    const key = familyName.toLocaleLowerCase('en-US');
    let normalized = byName.get(key);
    let includeFaces = true;
    if (!normalized) {
      normalized = {
        familyName,
        faces: [],
        availability,
        packageId,
        version,
        _faceKeys: new Set()
      };
      byName.set(key, normalized);
    } else if (availability === 'ready') {
      if (normalized.availability === 'download-required') {
        normalized.faces = [];
        normalized._faceKeys.clear();
      }
      normalized.availability = 'ready';
      delete normalized.packageId;
      delete normalized.version;
    } else if (normalized.availability === 'ready') {
      includeFaces = false;
    } else if (normalized.packageId !== packageId || normalized.version !== version) {
      fail('duplicate catalogue family records have conflicting Brightdesk package identities.');
    }

    for (const [faceIndex, face] of family.faces.entries()) {
      if (!includeFaces) continue;
      const label = 'families[' + familyIndex + '].faces[' + faceIndex + ']';
      if (!isRecord(face)) fail(label + ' must be an object.');
      requireAllowedKeys(
        face,
        ['faceName', 'postScriptName', 'style', 'weight', 'italic', 'oblique', 'axes', 'scripts', 'languages'],
        label
      );
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
      const seenAxisTags = new Set();
      const normalizedAxes = axes.map(axis => {
        if (!isRecord(axis)) fail(label + '.axes contains invalid OpenType axis metadata.');
        requireAllowedKeys(axis, ['tag', 'min', 'default', 'max'], label + '.axes item');
        if (
          typeof axis.tag !== 'string' ||
          !/^[A-Za-z0-9]{4}$/.test(axis.tag) ||
          ![axis.min, axis.default, axis.max].every(Number.isFinite) ||
          axis.min > axis.default ||
          axis.default > axis.max
        ) {
          fail(label + '.axes contains invalid OpenType axis metadata.');
        }
        if (seenAxisTags.has(axis.tag)) fail(label + '.axes contains duplicate OpenType axis tag: ' + axis.tag + '.');
        seenAxisTags.add(axis.tag);
        if (axis.tag === 'wght' && Math.round(axis.default) !== face.weight) {
          fail(label + '.wght axis default must match the face weight when rounded.');
        }
        return { tag: axis.tag, min: axis.min, default: axis.default, max: axis.max };
      });
      const normalizedFace = {
        faceName,
        style: face.style,
        weight: face.weight,
        italic: face.italic,
        oblique: face.oblique,
        axes: normalizedAxes
      };
      if (face.postScriptName !== undefined) {
        normalizedFace.postScriptName = requireText(face.postScriptName, label + '.postScriptName');
      }
      if (face.scripts !== undefined) {
        normalizedFace.scripts = normalizeStringList(face.scripts, label + '.scripts');
      }
      if (face.languages !== undefined) {
        normalizedFace.languages = normalizeStringList(face.languages, label + '.languages');
      }

      const signature = faceKey(normalizedFace);
      if (!normalized._faceKeys.has(signature)) {
        normalized._faceKeys.add(signature);
        normalized.faces.push(normalizedFace);
      }
    }
  }

  return [...byName.values()]
    .map(({ familyName, faces, availability, packageId, version }) => ({
      familyName,
      faces: faces.sort((a, b) => a.style.localeCompare(b.style) || a.weight - b.weight || a.faceName.localeCompare(b.faceName)),
      ...(availability === 'download-required' ? { availability, packageId, version } : {})
    }))
    .sort((a, b) => a.familyName.localeCompare(b.familyName, 'en', { sensitivity: 'base' }));
}

/** Safely quote an OS-reported family name for a CSS font-family declaration. */
export function escapeFontFamily(familyName) {
  requireText(familyName, 'familyName');
  const escaped = [...familyName].map(character => {
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

function boundedNumber(rawValue, minimum, maximum, fallback) {
  const number = Number(rawValue);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(maximum, Math.max(minimum, number));
}

function boundedInteger(rawValue, minimum, maximum, fallback) {
  return Math.round(boundedNumber(rawValue, minimum, maximum, fallback));
}

/**
 * Create a framework-neutral, accessible font-picker control group.
 *
 * Pass local, bundled or Brightdesk catalogue metadata. Download requests
 * are delegated to the host application's Brightdesk update channel; this
 * component never fetches remote files or installs fonts itself.
 */
export function createFontPicker({
  document,
  collection,
  initialValue = {},
  onChange,
  onDownload
} = {}) {
  if (!document || typeof document.createElement !== 'function') {
    fail('a document with createElement() is required.');
  }
  if (onChange !== undefined && typeof onChange !== 'function') {
    fail('onChange must be a function when provided.');
  }
  if (onDownload !== undefined && typeof onDownload !== 'function') {
    fail('onDownload must be a function when provided.');
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

  const availabilityStatus = createElement(document, 'p', 'bd-font-picker__availability', 'availability');
  availabilityStatus.setAttribute('role', 'status');
  availabilityStatus.setAttribute('aria-live', 'polite');
  availabilityStatus.hidden = true;

  const downloadButton = createElement(document, 'button', 'bd-font-picker__download', 'download');
  downloadButton.type = 'button';
  downloadButton.textContent = 'Download font';
  downloadButton.hidden = true;

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
    availabilityStatus,
    downloadButton,
    axisControls,
    createLabel(document, 'Preview text', specimenInput, 'bd-font-picker__specimen-field'),
    preview
  );

  let axisInputs = new Map();
  const pendingDownloads = new Set();

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
    const minimumWeight = weightAxis ? weightAxis.min : 1;
    const maximumWeight = weightAxis ? weightAxis.max : 1000;
    const weight = weightAxis
      ? boundedNumber(weightInput.value, minimumWeight, maximumWeight, face ? face.weight : weightAxis.default)
      : boundedInteger(weightInput.value, minimumWeight, maximumWeight, face ? face.weight : 400);
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
    weightInput.min = String(weightAxis ? weightAxis.min : 1);
    weightInput.max = String(weightAxis ? weightAxis.max : 1000);
    weightInput.step = weightAxis ? 'any' : '1';

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
    if (family.availability === 'download-required') {
      const option = createElement(document, 'option');
      option.value = '';
      option.textContent = 'Download to use this font';
      option.disabled = true;
      faceSelect.append(option);
      faceSelect.value = '';
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
      option.textContent = family.availability === 'download-required'
        ? family.familyName + ' (Download required)'
        : family.familyName;
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
    const family = selectedFamily();
    const hasFamily = Boolean(value.familyName);
    const isDownloadRequired = Boolean(family && family.availability === 'download-required');
    const isReady = hasFamily && !isDownloadRequired;

    for (const control of [faceSelect, sizeInput, weightInput, italicInput, specimenInput]) {
      control.disabled = !isReady;
    }
    availabilityStatus.hidden = !isDownloadRequired;
    downloadButton.hidden = !isDownloadRequired;
    downloadButton.disabled = !onDownload || pendingDownloads.has(family && family.familyName);

    if (isDownloadRequired) {
      availabilityStatus.textContent = onDownload
        ? 'Download and install this font before using it.'
        : 'This font needs to be downloaded through Brightdesk updates before it can be used.';
      preview.textContent = 'Download and install this font to use it.';
      preview.style.fontFamily = '';
      preview.style.fontSize = '';
      preview.style.fontWeight = '';
      preview.style.fontStyle = '';
      preview.style.fontVariationSettings = 'normal';
      return;
    }

    if (!hasFamily) {
      availabilityStatus.hidden = true;
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
    const minimumWeight = weightAxis ? weightAxis.min : 1;
    const maximumWeight = weightAxis ? weightAxis.max : 1000;
    weightInput.value = String(weightAxis
      ? boundedNumber(weightInput.value, minimumWeight, maximumWeight, face ? face.weight : weightAxis.default)
      : boundedInteger(weightInput.value, minimumWeight, maximumWeight, face ? face.weight : 400));
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

  function setCollection(nextCollection) {
    const previous = currentValue();
    families = normalizeFontFamilies(nextCollection);
    rebuildFamilyOptions(previous.familyName, previous);
    apply(false);
    return currentValue();
  }

  function requestDownload() {
    const family = selectedFamily();
    if (!family || family.availability !== 'download-required' || !onDownload) return;

    const request = Object.freeze({
      familyName: family.familyName,
      packageId: family.packageId,
      version: family.version
    });
    pendingDownloads.add(family.familyName);
    apply(false);
    availabilityStatus.textContent = 'Requesting font package from Brightdesk updates.';

    const finish = nextCollection => {
      pendingDownloads.delete(family.familyName);
      if (isRecord(nextCollection) && Array.isArray(nextCollection.families)) {
        setCollection(nextCollection);
      } else {
        apply(false);
        if (selectedFamily() && selectedFamily().familyName === family.familyName) {
          availabilityStatus.textContent = 'Download request submitted. Refresh font availability after Brightdesk verifies and installs the package.';
        }
      }
    };
    const reject = error => {
      pendingDownloads.delete(family.familyName);
      apply(false);
      const message = error && typeof error.message === 'string' ? error.message.slice(0, 200) : 'Please try again.';
      if (selectedFamily() && selectedFamily().familyName === family.familyName) {
        availabilityStatus.textContent = 'Font download failed. ' + message;
      }
    };

    try {
      const result = onDownload(request);
      if (result && typeof result.then === 'function') {
        return result.then(finish).catch(reject);
      }
      finish(result);
      return result;
    } catch (error) {
      reject(error);
      return undefined;
    }
  }

  familySelect.addEventListener('change', () => {
    rebuildFaceOptions();
    update();
  });
  downloadButton.addEventListener('click', requestDownload);
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
  if (initialValue.weight !== undefined) {
    weightInput.value = String(initialValue.weight);
  } else if (isRecord(initialValue.axes) && initialValue.axes.wght !== undefined) {
    weightInput.value = String(initialValue.axes.wght);
  }
  if (initialValue.style !== undefined) {
    italicInput.checked = initialValue.style === 'italic';
  } else if (initialValue.italic !== undefined) {
    italicInput.checked = initialValue.italic === true;
  } else {
    italicInput.checked = Boolean(selectedFace() && selectedFace().italic);
  }
  if (initialValue.weight === undefined && !(isRecord(initialValue.axes) && initialValue.axes.wght !== undefined)) updateInitialAxisWeight();
  apply(false);

  return {
    element: root,
    getValue: currentValue,
    getAvailability() {
      const family = selectedFamily();
      if (!family) return { familyName: '', status: 'none' };
      return family.availability === 'download-required'
        ? { familyName: family.familyName, status: 'download-required', packageId: family.packageId, version: family.version }
        : { familyName: family.familyName, status: 'ready' };
    },
    setCollection,
    setValue(nextValue) {
      if (!isRecord(nextValue)) fail('setValue() expects an object.');
      const previous = currentValue();
      const preferredFamily = nextValue.familyName === undefined ? familySelect.value : nextValue.familyName;
      const preferredFace = nextValue.faceName === undefined ? previous.faceName : nextValue.faceName;
      const preferredStyle = nextValue.style === undefined ? previous.style : nextValue.style;
      const preferredAxes = nextValue.axes === undefined ? previous.axes : nextValue.axes;
      const preferredWeight = nextValue.weight === undefined
        ? (isRecord(preferredAxes) && preferredAxes.wght !== undefined ? preferredAxes.wght : previous.weight)
        : nextValue.weight;
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
