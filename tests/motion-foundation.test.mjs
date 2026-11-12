import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const motion = fs.readFileSync(new URL('../css/motion.css', import.meta.url), 'utf8');
const tokens = fs.readFileSync(new URL('../css/tokens.css', import.meta.url), 'utf8');
const productWindow = fs.readFileSync(new URL('../css/product-window.css', import.meta.url), 'utf8');

test('shared motion tokens define a consistent timing and easing scale', () => {
  assert.ok(tokens.includes('--bd-motion-duration-fast: 120ms'));
  assert.ok(tokens.includes('--bd-motion-duration-normal: 180ms'));
  assert.ok(tokens.includes('--bd-motion-duration-slow: 260ms'));
  assert.ok(tokens.includes('--bd-motion-ease-standard: cubic-bezier('));
  assert.ok(tokens.includes('--bd-navigation-motion-duration: var(--bd-motion-duration-normal)'));
});

test('motion primitives are opt-in and avoid broad all-property transitions', () => {
  for (const className of [
    '.bd-motion-surface',
    '.bd-motion-interactive',
    '.bd-motion-overlay',
    '.bd-motion-fade',
    '.bd-motion-slide',
    '.bd-motion-spinner',
    '.bd-motion-progress'
  ]) {
    assert.ok(motion.includes(className), 'missing ' + className + ' primitive');
  }
  assert.ok(!motion.includes('transition: all'), 'motion must not animate every property');
});

test('overlay state supports a visible open state and a hidden closed state', () => {
  assert.ok(motion.includes('.bd-motion-overlay[data-state="open"]'));
  assert.ok(motion.includes('visibility: hidden'));
  assert.ok(motion.includes('visibility: visible'));
});

test('loading indicator animation is disabled when reduced motion is requested', () => {
  assert.ok(motion.includes('@keyframes bd-motion-spin'));
  assert.ok(motion.includes('@media (prefers-reduced-motion: reduce)'));
  assert.ok(motion.includes('animation: none !important'));
  assert.ok(motion.includes('transition: none !important'));
});

test('shared progress feedback animates only the visual value change', () => {
  assert.ok(motion.includes('.bd-motion-progress'));
  assert.ok(motion.includes('transition: width var(--bd-motion-duration-normal, 180ms)'));
});

test('product-window navigation uses the shared easing token', () => {
  assert.ok(productWindow.includes('var(--bd-motion-ease-standard, ease)'));
});
