import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../css/product-window.css', import.meta.url), 'utf8');

test('compact product navigation keeps labels available to assistive technology', () => {
  const match = css.match(/html\.is-product-window \.sidebar\.is-compact \.nav > span\s*\{([^}]*)\}/);
  assert.ok(match, 'compact navigation label rule must exist');
  assert.match(match[1], /position:\s*absolute/i);
  assert.match(match[1], /clip:\s*rect\(/i);
  assert.match(match[1], /white-space:\s*nowrap/i);
  assert.doesNotMatch(match[1], /display:\s*none/i);
});

test('mobile navigation scrim is scoped to individual product windows', () => {
  assert.match(css, /html\.is-product-window\s+body\.sidebar-mobile-open::before\s*\{/);
  assert.doesNotMatch(css, /(^|\n)body\.sidebar-mobile-open::before\s*\{/);
});

test('product shell respects reduced-motion preferences', () => {
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /transition-duration:\s*\.01ms\s*!important/i);
});
