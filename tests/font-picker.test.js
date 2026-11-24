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

test('normalizes approved bundled font families without changing their original names', () => {
  const result = normalizeFontFamilies({
    source: 'bundled',
    families: [{
      familyName: 'Inter',
      faces: [{ faceName: 'Inter', style: 'normal', weight: 400, italic: false, oblique: false, axes: [
        { tag: 'opsz', min: 14, default: 14, max: 32 },
        { tag: 'wght', min: 100, default: 400, max: 900 }
      ] }]
    }]
  });

  assert.equal(result[0].familyName, 'Inter');
  assert.equal(result[0].faces[0].faceName, 'Inter');
  assert.deepEqual(result[0].faces[0].axes.map(axis => axis.tag), ['opsz', 'wght']);
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
    faceName: 'Aptos',
    fontSizePt: 18,
    weight: 650,
    style: 'italic',
    axes: {},
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
  assert.deepEqual(picker.getValue().axes, { wght: 400, wdth: 110, opsz: 18 });
  assert.deepEqual(changes.at(-1).axes, { wght: 400, wdth: 110, opsz: 18 });
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
  face.value = String(face.children.findIndex(option => option.textContent === 'Example Variable Semibold Italic'));
  face.dispatch('change');

  assert.equal(picker.getValue().faceName, 'Example Variable Semibold Italic');
  assert.equal(picker.getValue().weight, 600);
  assert.equal(picker.getValue().style, 'italic');
  assert.deepEqual(picker.getValue().axes, {});
  assert.equal(picker.element.queryByControl('axis-wdth'), null);
  assert.equal(picker.element.queryByControl('preview').style.fontVariationSettings, 'normal');
});


test('keeps the selected face and clamps its axes when local font metadata refreshes', () => {
  const initialCollection = systemCollection([
    {
      familyName: 'Refresh Variable',
      faces: [{
        faceName: 'Refresh Variable Text',
        style: 'normal',
        weight: 400,
        italic: false,
        oblique: false,
        axes: [{ tag: 'wdth', min: 75, default: 100, max: 125 }]
      }]
    }
  ]);
  const picker = createFontPicker({
    document: fakeDocument,
    collection: initialCollection,
    initialValue: {
      familyName: 'Refresh Variable',
      faceName: 'Refresh Variable Text',
      axes: { wdth: 120 }
    }
  });

  const refreshedCollection = systemCollection([
    {
      familyName: 'Refresh Variable',
      faces: [{
        faceName: 'Refresh Variable Text',
        style: 'normal',
        weight: 400,
        italic: false,
        oblique: false,
        axes: [{ tag: 'wdth', min: 80, default: 100, max: 110 }]
      }]
    }
  ]);
  const value = picker.setCollection(refreshedCollection);

  assert.equal(value.faceName, 'Refresh Variable Text');
  assert.deepEqual(value.axes, { wdth: 110 });
  assert.equal(picker.element.queryByControl('axis-wdth').value, '110');
});


test('uses the installed face style when a family has no normal face', () => {
  const picker = createFontPicker({
    document: fakeDocument,
    collection: systemCollection([
      {
        familyName: 'Italic Only',
        faces: [{
          faceName: 'Italic Only Italic',
          style: 'italic',
          weight: 400,
          italic: true,
          oblique: false,
          axes: []
        }]
      }
    ])
  });

  assert.equal(picker.getValue().faceName, 'Italic Only Italic');
  assert.equal(picker.getValue().style, 'italic');
});


test('applies programmatic variable weight values through the shared axes API', () => {
  const picker = createFontPicker({
    document: fakeDocument,
    collection: systemCollection([
      {
        familyName: 'Programmatic Variable',
        faces: [{
          faceName: 'Programmatic Variable',
          style: 'normal',
          weight: 400,
          italic: false,
          oblique: false,
          axes: [
            { tag: 'wght', min: 300, default: 400, max: 700 },
            { tag: 'wdth', min: 75, default: 100, max: 125 }
          ]
        }]
      }
    ])
  });

  const value = picker.setValue({ axes: { wght: 625, wdth: 105 } });

  assert.equal(value.weight, 625);
  assert.deepEqual(value.axes, { wght: 625, wdth: 105 });
  assert.equal(picker.element.queryByControl('weight').value, '625');
});


test('preserves fractional values across the variable font weight axis', () => {
  const picker = createFontPicker({
    document: fakeDocument,
    collection: systemCollection([{
      familyName: 'Fractional Weight',
      faces: [{
        faceName: 'Fractional Weight Variable',
        style: 'normal',
        weight: 425,
        italic: false,
        oblique: false,
        axes: [{ tag: 'wght', min: 325.5, default: 425.25, max: 675.5 }]
      }]
    }])
  });

  const weight = picker.element.queryByControl('weight');
  assert.equal(weight.min, '325.5');
  assert.equal(weight.max, '675.5');
  assert.equal(weight.step, 'any');
  assert.equal(weight.value, '425.25');
  assert.equal(picker.getValue().weight, 425.25);
  assert.equal(picker.getValue().axes.wght, 425.25);

  weight.value = '512.5';
  weight.dispatch('input');
  assert.equal(picker.getValue().weight, 512.5);
  assert.equal(picker.getValue().axes.wght, 512.5);
  assert.equal(picker.element.queryByControl('preview').style.fontWeight, '512.5');
});


test('preserves exact operating-system family, face and PostScript names', () => {
  const collection = systemCollection([
    {
      familyName: ' Aptos ',
      faces: [{
        faceName: ' Aptos Regular ',
        postScriptName: ' Aptos-Regular ',
        style: 'normal',
        weight: 400,
        italic: false,
        oblique: false,
        axes: []
      }]
    }
  ]);

  const result = normalizeFontFamilies(collection);
  assert.equal(result[0].familyName, ' Aptos ');
  assert.equal(result[0].faces[0].faceName, ' Aptos Regular ');
  assert.equal(result[0].faces[0].postScriptName, ' Aptos-Regular ');
  assert.equal(escapeFontFamily(' Aptos '), '" Aptos ", sans-serif');
});

test('rejects unapproved filesystem and source metadata at the UI boundary', () => {
  const collectionExtra = systemCollection();
  collectionExtra.downloadUrl = 'https://example.invalid/font';
  assert.throws(() => normalizeFontFamilies(collectionExtra), /unsupported property.*downloadUrl/i);

  const familyExtra = systemCollection();
  familyExtra.families[0].path = '/Users/example/Fonts/Aptos.ttf';
  assert.throws(() => normalizeFontFamilies(familyExtra), /unsupported property.*path/i);

  const faceExtra = systemCollection();
  faceExtra.families[0].faces[0].sha256 = 'a'.repeat(64);
  assert.throws(() => normalizeFontFamilies(faceExtra), /unsupported property.*sha256/i);

  const axisExtra = systemCollection([{
    familyName: 'Variable',
    faces: [{
      faceName: 'Variable',
      style: 'normal',
      weight: 400,
      italic: false,
      oblique: false,
      axes: [{ tag: 'wght', min: 100, default: 400, max: 900, filePath: '/private/font.ttf' }]
    }]
  }]);
  assert.throws(() => normalizeFontFamilies(axisExtra), /unsupported property.*filePath/i);
});

test('rejects duplicate OpenType axis tags and inconsistent variable weight defaults', () => {
  const duplicateTags = systemCollection([{
    familyName: 'Duplicate Axes',
    faces: [{
      faceName: 'Duplicate Axes',
      style: 'normal',
      weight: 400,
      italic: false,
      oblique: false,
      axes: [
        { tag: 'wght', min: 100, default: 400, max: 900 },
        { tag: 'wght', min: 200, default: 400, max: 800 }
      ]
    }]
  }]);
  assert.throws(() => normalizeFontFamilies(duplicateTags), /duplicate OpenType axis tag/i);

  const weightMismatch = systemCollection([{
    familyName: 'Weight Mismatch',
    faces: [{
      faceName: 'Weight Mismatch',
      style: 'normal',
      weight: 450,
      italic: false,
      oblique: false,
      axes: [{ tag: 'wght', min: 100, default: 400, max: 900 }]
    }]
  }]);
  assert.throws(() => normalizeFontFamilies(weightMismatch), /wght axis default must match/i);
});

test('validates optional script and language tags without changing their exact values', () => {
  const result = normalizeFontFamilies(systemCollection([{
    familyName: 'Multilingual',
    faces: [{
      faceName: 'Multilingual Regular',
      style: 'normal',
      weight: 400,
      italic: false,
      oblique: false,
      axes: [],
      scripts: ['Latn', 'Cyrl'],
      languages: ['en', 'sr-Latn']
    }]
  }]));
  assert.deepEqual(result[0].faces[0].scripts, ['Latn', 'Cyrl']);
  assert.deepEqual(result[0].faces[0].languages, ['en', 'sr-Latn']);

  const duplicate = systemCollection([{
    familyName: 'Duplicate Scripts',
    faces: [{
      faceName: 'Duplicate Scripts',
      style: 'normal',
      weight: 400,
      italic: false,
      oblique: false,
      axes: [],
      scripts: ['Latn', 'Latn']
    }]
  }]);
  assert.throws(() => normalizeFontFamilies(duplicate), /duplicate.*scripts/i);
});


function downloadableFontCollection(familyName = 'Orbit Sans') {
  return {
    source: 'catalogue',
    families: [{
      familyName,
      availability: 'download-required',
      packageId: 'google:orbit-sans',
      version: '1.0.0',
      faces: [{
        faceName: familyName + ' Variable',
        style: 'normal',
        weight: 400,
        italic: false,
        oblique: false,
        axes: [{ tag: 'wght', min: 100, default: 400, max: 900 }]
      }]
    }]
  };
}

test('shows catalogue fonts before download but blocks their use until installed', () => {
  const picker = createFontPicker({
    document: fakeDocument,
    collection: downloadableFontCollection(),
    onDownload: () => {}
  });

  const family = picker.element.queryByControl('family');
  const face = picker.element.queryByControl('face');
  const preview = picker.element.queryByControl('preview');
  const download = picker.element.queryByControl('download');
  const size = picker.element.queryByControl('size');

  assert.equal(family.disabled, false);
  assert.equal(family.children[0].textContent, 'Orbit Sans (Download required)');
  assert.deepEqual(picker.getAvailability(), {
    familyName: 'Orbit Sans',
    status: 'download-required',
    packageId: 'google:orbit-sans',
    version: '1.0.0'
  });
  assert.equal(face.disabled, true);
  assert.equal(size.disabled, true);
  assert.equal(preview.textContent, 'Download and install this font to use it.');
  assert.equal(preview.style.fontFamily, '');
  assert.equal(download.hidden, false);
  assert.equal(download.disabled, false);
});

test('requests a Brightdesk font package and refreshes the picker after local installation', () => {
  let request;
  const installed = {
    source: 'bundled',
    families: [{
      familyName: 'Orbit Sans',
      faces: [{
        faceName: 'Orbit Sans Variable',
        style: 'normal',
        weight: 400,
        italic: false,
        oblique: false,
        axes: [{ tag: 'wght', min: 100, default: 400, max: 900 }]
      }]
    }]
  };
  const picker = createFontPicker({
    document: fakeDocument,
    collection: downloadableFontCollection(),
    onDownload(value) {
      request = value;
      return installed;
    }
  });

  picker.element.queryByControl('download').dispatch('click');

  assert.deepEqual(request, {
    familyName: 'Orbit Sans',
    packageId: 'google:orbit-sans',
    version: '1.0.0'
  });
  assert.equal(picker.getAvailability().status, 'ready');
  assert.equal(picker.element.queryByControl('download').hidden, true);
  assert.equal(picker.element.queryByControl('face').disabled, false);
  assert.equal(picker.getValue().familyName, 'Orbit Sans');
  assert.equal(picker.getValue().faceName, 'Orbit Sans Variable');
});

test('a font already installed locally remains ready even when its catalogue record says download required', () => {
  const result = normalizeFontFamilies({
    source: 'combined',
    families: [
      {
        familyName: 'Aptos',
        availability: 'download-required',
        packageId: 'microsoft:aptos',
        version: '1.0.0',
        faces: [{ faceName: 'Aptos', style: 'normal', weight: 400, italic: false, oblique: false, axes: [] }]
      },
      {
        familyName: 'Aptos',
        availability: 'ready',
        faces: [{ faceName: 'Aptos', style: 'normal', weight: 400, italic: false, oblique: false, axes: [] }]
      }
    ]
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].availability, 'ready');
  assert.equal(result[0].faces.length, 1);
});

test('rejects catalogue-only fonts that lack a safe Brightdesk package identity', () => {
  const invalid = downloadableFontCollection();
  delete invalid.families[0].packageId;
  assert.throws(() => normalizeFontFamilies(invalid), /packageId/);
});
