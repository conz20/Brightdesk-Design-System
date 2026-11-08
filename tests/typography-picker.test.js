const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildTypographyPickerModel,
  escapeCssFamilyName,
  normalizeInstalledFontFamilies,
  normalizeTypographySize
} = require('../js/typography-picker');

test('normalises installed font family records while preserving OS-reported names', () => {
  const families = normalizeInstalledFontFamilies([
    { familyName: 'Segoe UI', faces: [] },
    { familyName: 'Aptos', faces: [] },
    { familyName: 'Segoe UI', faces: [] },
    'Calibri'
  ]);

  assert.deepEqual(families, ['Aptos', 'Calibri', 'Segoe UI']);
});

test('drops invalid, empty and overlong font family names', () => {
  const families = normalizeInstalledFontFamilies([
    null,
    {},
    { familyName: '   ' },
    { familyName: 'Bad\u0000Font' },
    { familyName: 'x'.repeat(257) },
    { familyName: 'Arial' }
  ]);

  assert.deepEqual(families, ['Arial']);
});

test('limits the number of family options and removes case-insensitive duplicates', () => {
  const families = normalizeInstalledFontFamilies([
    'Aptos',
    'aptos',
    ...Array.from({ length: 5100 }, (_, index) => `Family ${index}`)
  ]);

  assert.equal(families.length, 5000);
  assert.equal(families.filter(name => name.toLocaleLowerCase('en-US') === 'aptos').length, 1);
  assert.equal(families[0], 'Aptos');
});

test('normalises typography sizes to the approved point-size set', () => {
  assert.equal(normalizeTypographySize(12), 12);
  assert.equal(normalizeTypographySize('10.5'), 10.5);
  assert.equal(normalizeTypographySize(1000), 11);
  assert.equal(normalizeTypographySize('not-a-size'), 11);
  assert.equal(normalizeTypographySize(null), 11);
});

test('escapes font family names before creating CSS font-family values', () => {
  assert.equal(escapeCssFamilyName('Segoe UI'), '"Segoe UI"');
  assert.equal(escapeCssFamilyName('Odd "Name"'), '"Odd \\"Name\\""');
  assert.equal(escapeCssFamilyName('Line\nBreak'), '"Line\\a Break"');
  assert.equal(escapeCssFamilyName('Back\\slash'), '"Back\\\\slash"');
});

test('model only selects a family that is in the installed local family list', () => {
  const model = buildTypographyPickerModel({
    families: ['Aptos', 'Calibri'],
    fontFamily: 'Calibri',
    fontSize: 12
  });

  assert.deepEqual(model.families, ['Aptos', 'Calibri']);
  assert.equal(model.selectedFamily, 'Calibri');
  assert.equal(model.unavailableFamily, '');
  assert.equal(model.fontSize, 12);
});

test('model preserves a document font choice when the face is no longer installed', () => {
  const model = buildTypographyPickerModel({
    families: ['Aptos'],
    fontFamily: 'Cambria',
    fontSize: 10
  });

  assert.equal(model.selectedFamily, '');
  assert.equal(model.unavailableFamily, 'Cambria');
  assert.equal(model.fontSize, 10);
});
