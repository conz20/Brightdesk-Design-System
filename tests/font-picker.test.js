'use strict';

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createFontPicker,
  escapeFontFamily,
  normalizeFontFamilies
} from '../components/font-picker.js';

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.attributes = {};
    this.dataset = {};
    this.style = {};
    this.listeners = new Map();
    this.value = '';
    this.checked = false;
    this.disabled = false;
    this.textContent = '';
  }

  append(...children) {
    this.children.push(...children);
  }

  replaceChildren(...children) {
    this.children = [...children];
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  addEventListener(name, callback) {
    const callbacks = this.listeners.get(name) ?? [];
    callbacks.push(callback);
    this.listeners.set(name, callbacks);
  }

  dispatch(name) {
    for (const callback of this.listeners.get(name) ?? []) callback({ target: this });
  }

  queryByControl(control) {
    if (this.dataset.control === control) return this;
    for (const child of this.children) {
      const match = child.queryByControl?.(control);
      if (match) return match;
    }
    return null;
  }

  get classList() {
    return { add: () => {} };
  }
}

const fakeDocument = {
  createElement(tagName) {
    return new FakeElement(tagName);
  }
};

function systemCollection(families = [
  {
    familyName: 'Aptos',
    faces: [
      { faceName: 'Aptos', style: 'normal', weight: 400, italic: false, oblique: false, axes: [] },
      { faceName: 'Aptos Bold', style: 'normal', weight: 700, italic: false, oblique: false, axes: [] },
      { faceName: 'Aptos Italic', style: 'italic', weight: 400, italic: true, oblique: false, axes: [] }
    ]
  }
]) {
  return { source: 'system', platform: 'windows', provider: 'windows-directwrite', families };
}

test('normalizes the local system-font collection without losing Microsoft family names', () => {
  const result = normalizeFontFamilies(systemCollection([
    { familyName: 'Aptos', faces: [{ faceName: 'Aptos', style: 'normal', weight: 400, italic: false, oblique: false, axes: [] }] },
    { familyName: 'Segoe UI Variable', faces: [{ faceName: 'Segoe UI Variable Text', style: 'normal', weight: 400, italic: false, oblique: false, axes: [{ tag: 'wght', min: 300, default: 400, max: 700 }] }] }
  ]));

  assert.deepEqual(result.map(item => item.familyName), ['Aptos', 'Segoe UI Variable']);
  assert.equal(result[1].faces[0].faceName, 'Segoe UI Variable Text');
});

test('merges repeated family records but retains distinct installed faces', () => {
  const result = normalizeFontFamilies(systemCollection([
    { familyName: 'Aptos', faces: [{ faceName: 'Aptos', style: 'normal', weight: 400, italic: false, oblique: false, axes: [] }] },
    { familyName: 'aptos', faces: [{ faceName: 'Aptos Bold', style: 'normal', weight: 700, italic: false, oblique: false, axes: [] }] }
  ]));

  assert.equal(result.length, 1);
  assert.deepEqual(result[0].faces.map(face => face.faceName), ['Aptos', 'Aptos Bold']);
});

test('rejects malformed local font metadata rather than silently guessing', () => {
  assert.throws(
    () => normalizeFontFamilies({ source: 'system', families: [{ familyName: '   ', faces: [] }] }),
    /familyName/
  );
});

test('does not collapse variable faces with different declared axis ranges', () => {
  const result = normalizeFontFamilies(systemCollection([
    {
      familyName: 'Variable Example',
      faces: [
        { faceName: 'Variable Example', style: 'normal', weight: 400, italic: false, oblique: false, axes: [{ tag: 'wght', min: 200, default: 400, max: 900 }] },
        { faceName: 'Variable Example', style: 'normal', weight: 400, italic: false, oblique: false, axes: [{ tag: 'wght', min: 300, default: 400, max: 700 }] }
      ]
    }
  ]));

  assert.equal(result[0].faces.length, 2);
});

test('escapes quotes, backslashes and control characters in CSS family names', () => {
  assert.equal(escapeFontFamily('A "quoted" \\ family'), '"A \\"quoted\\" \\\\ family", sans-serif');
  assert.match(escapeFontFamily('A\u0001B'), /\\1 /);
});

test('creates labelled controls and updates the local preview when a setting changes', () => {
  const changes = [];
  const picker = createFontPicker({
    document: fakeDocument,
    collection: systemCollection(),
    onChange: value => changes.push(value)
  });

  const family = picker.element.queryByControl('family');
  const size = picker.element.queryByControl('size');
  const weight = picker.element.queryByControl('weight');
  const italic = picker.element.queryByControl('italic');
  const specimen = picker.element.queryByControl('specimen');
  const preview = picker.element.queryByControl('preview');

  assert.equal(family.attributes['aria-label'], 'Font family');
  assert.equal(size.attributes['aria-label'], 'Font size (points)');
  assert.equal(weight.attributes['aria-label'], 'Font weight');
  assert.equal(italic.attributes['aria-label'], 'Italic');
  assert.equal(specimen.attributes['aria-label'], 'Preview text');
  assert.equal(picker.getValue().familyName, 'Aptos');

  size.value = '18';
  weight.value = '650';
  italic.checked = true;
  specimen.value = 'Brightdesk local preview';
  size.dispatch('input');

  assert.equal(preview.style.fontSize, '24px');
  assert.equal(preview.style.fontWeight, '650');
  assert.equal(preview.style.fontStyle, 'italic');
  assert.equal(preview.textContent, 'Brightdesk local preview');
  assert.deepEqual(changes.at(-1), {
    familyName: 'Aptos',
    fontSizePt: 18,
    weight: 650,
    style: 'italic',
    text: 'Brightdesk local preview'
  });
});

test('shows an honest empty state when no local fonts are available', () => {
  const picker = createFontPicker({
    document: fakeDocument,
    collection: systemCollection([])
  });

  const family = picker.element.queryByControl('family');
  const preview = picker.element.queryByControl('preview');

  assert.equal(family.disabled, true);
  assert.equal(preview.textContent, 'No installed fonts were found.');
  assert.equal(picker.getValue().familyName, '');
});


test('lets the user choose an installed face and adjust its variable font axes', () => {
  const collection = systemCollection([
    {
      familyName: 'Segoe UI Variable',
      faces: [
        {
          faceName: 'Segoe UI Variable Text',
          style: 'normal',
          weight: 400,
          italic: false,
          oblique: false,
          axes: [
            { tag: 'wght', min: 300, default: 400, max: 700 },
            { tag: 'wdth', min: 75, default: 100, max: 125 },
            { tag: 'opsz', min: 8, default: 14, max: 72 }
          ]
        }
      ]
    }
  ]);
  const changes = [];
  const picker = createFontPicker({
    document: fakeDocument,
    collection,
    initialValue: {
      familyName: 'Segoe UI Variable',
      faceName: 'Segoe UI Variable Text',
      fontSizePt: 12,
      weight: 400,
      style: 'normal',
      axes: { wdth: 90, opsz: 18 }
    },
    onChange: value => changes.push(value)
  });

  const face = picker.element.queryByControl('face');
  const width = picker.element.queryByControl('axis-wdth');
  const opticalSize = picker.element.queryByControl('axis-opsz');
  const preview = picker.element.queryByControl('preview');

  assert.ok(face);
  assert.equal(face.attributes['aria-label'], 'Installed font face');
  assert.equal(face.children[0].textContent, 'Segoe UI Variable Text');
  assert.equal(width.value, '90');
  assert.equal(opticalSize.value, '18');

  width.value = '110';
  width.dispatch('input');

  assert.equal(preview.style.fontVariationSettings, '"wdth" 110, "opsz" 18');
  assert.equal(picker.getValue().faceName, 'Segoe UI Variable Text');
  assert.deepEqual(picker.getValue().axes, { wdth: 110, opsz: 18 });
  assert.deepEqual(changes.at(-1).axes, { wdth: 110, opsz: 18 });
});

test('updates the selected face defaults and removes axes unavailable on the new face', () => {
  const collection = systemCollection([
    {
      familyName: 'Example Variable',
      faces: [
        {
          faceName: 'Example Variable Regular',
          style: 'normal',
          weight: 400,
          italic: false,
          oblique: false,
          axes: [{ tag: 'wdth', min: 80, default: 100, max: 120 }]
        },
        {
          faceName: 'Example Variable Semibold Italic',
          style: 'italic',
          weight: 600,
          italic: true,
          oblique: false,
          axes: []
        }
      ]
    }
  ]);
  const picker = createFontPicker({
    document: fakeDocument,
    collection,
    initialValue: {
      familyName: 'Example Variable',
      faceName: 'Example Variable Regular',
      axes: { wdth: 110 }
    }
  });

  const face = picker.element.queryByControl('face');
  face.value = '1';
  face.dispatch('change');

  assert.equal(picker.getValue().faceName, 'Example Variable Semibold Italic');
  assert.equal(picker.getValue().weight, 600);
  assert.equal(picker.getValue().style, 'italic');
  assert.deepEqual(picker.getValue().axes, {});
  assert.equal(picker.element.queryByControl('axis-wdth'), null);
  assert.equal(picker.element.queryByControl('preview').style.fontVariationSettings, 'normal');
});
