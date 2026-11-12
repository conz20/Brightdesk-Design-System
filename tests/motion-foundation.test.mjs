import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const motion = fs.readFileSync(new URL('../css/motion.css', import.meta.url), 'utf8');
const tokens = fs.readFileSync(new URL('../css/tokens.css', import.meta.url), 'utf8');

test('shared motion tokens define a consistent timing and easing scale', () => {
  assert.match(tokens, /--bd-motion-duration-fast:\s*120ms/);
  assert.match(tokens, /--bd-motion-duration-normal:\s*180ms/);
  assert.match(tokens, /--bd-motion-duration-slow:\s*260ms/);
  assert.match(tokens, /--bd-motion-ease-standard:\s*cubic-bezier\(/);
  assert.match(tokens, /--bd-navigation-motion-duration:\s*var\(--bd-motion-duration-normal\)/);
});

test('motion primitives are opt-in and avoid broad all-property transitions', () => {
  for (const className of [
    'bd-motion-surface',
    'bd-motion-interactive',
    'bd-motion-overlay',
    'bd-motion-fade',
    'bd-motion-slide',
    'bd-motion-spinner',
    'bd-motion-progress'
  ]) {
    assert.match(motion, new RegExp('\\\\.' + className + '(?:\\\\s|\\\\{|:|\\\\[)'));
  }
  assert.doesNotMatch(motion, /transition:\\s*all\\b/i);
});

test('overlay state supports a visible open state and a hidden closed state', () => {
  assert.match(motion, /\\.bd-motion-overlay\\[data-state="open"\\]/);
  assert.match(motion, /visibility:\\s*hidden/i);
  assert.match(motion, /visibility:\\s*visible/i);
});

test('loading indicator has an animation that remains understandable without motion', () => {
  assert.match(motion, /@keyframes\\s+bd-motion-spin/);
  assert.match(motion, /\\.bd-motion-spinner/);
  assert.match(motion, /@media\\s*\\(prefers-reduced-motion:\\s*reduce\\)/);
  assert.match(motion, /animation:\\s*none\\s*!important/i);
  assert.match(motion, /transition:\\s*none\\s*!important/i);
});

test('shared progress feedback animates only the visual value change', () => {
  assert.match(motion, /\\.bd-motion-progress/);
  assert.match(motion, /transition:\\s*width\\s+var\\(--bd-motion-duration-normal/);
});
