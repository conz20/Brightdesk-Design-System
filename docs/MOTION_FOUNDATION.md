# Shared motion foundation

The Brightdesk Design System owns the shared timing, easing and reusable motion classes used by the ten Office Suite products. Product-specific state and interaction logic remain inside each product.

## Load order

Load the shared CSS in this order:

1. `css/tokens.css`
2. `css/motion.css`
3. Product component styles, including `css/product-window.css` where applicable

The CSS is copied into each product's packaged source tree. Product windows do not fetch styles or animation assets from GitHub or another network service at runtime.

## Shared timing

Use the canonical tokens instead of inventing product-specific timings:

| Token | Value | Intended use |
| --- | ---: | --- |
| `--bd-motion-duration-fast` | 120 ms | Small control feedback |
| `--bd-motion-duration-normal` | 180 ms | Menus, panels and normal state changes |
| `--bd-motion-duration-slow` | 260 ms | Larger, deliberate surface changes |
| `--bd-motion-duration-spinner` | 900 ms | Loading indicator rotation |

Use `--bd-motion-ease-standard` for ordinary changes, `--bd-motion-ease-enter` for entering surfaces and `--bd-motion-ease-exit` for exits. Keep motion short and purposeful.

## Available classes

- `.bd-motion-surface` transitions surface colour, border, shadow, opacity and transform.
- `.bd-motion-interactive` gives controls consistent feedback; its slight hover lift only runs on hover-capable devices when reduced motion is not requested.
- `.bd-motion-fade` fades an element. Set `data-state="closed"` to make it transparent.
- `.bd-motion-slide` combines a short vertical movement with opacity. Set `data-state="closed"` for the hidden state.
- `.bd-motion-overlay` is hidden by default and becomes visible with `data-state="open"`. Use it for menus, popovers and other non-modal floating surfaces; keep focus and dismissal behaviour in the component.
- `.bd-motion-progress` transitions the width of a progress visual.
- `.bd-motion-spinner` rotates a visual loading indicator. The consuming control must still provide an accessible name or status text.

All classes are opt-in. The stylesheet does not attach motion to every button, panel, menu or dialog automatically.

## Accessibility and performance

- The `prefers-reduced-motion: reduce` preference disables these transitions and the spinner animation. State and progress must remain understandable without movement.
- Keep keyboard focus visible. Never use movement as the only indication of focus, selection, loading or completion.
- Keep menus and overlays keyboard operable. Animation does not replace focus management, Escape handling, accessible names or correct ARIA state.
- Avoid animating layout properties such as `width`, `height`, margins or padding for ordinary UI transitions. Use opacity and transform for surfaces; progress visuals are the deliberate width-transition exception.
- Do not add long, decorative or continuously looping animations. Reserve the spinner for genuine waiting states.
- Test the normal-motion and reduced-motion states in each consuming product.

## Verification

`tests/motion-foundation.test.mjs` guards the shared token scale, opt-in primitives, overlay states, loading indicator and reduced-motion handling. Run `npm run verify` with the repository's required Node.js 24.22.2 runtime.

This repository is the canonical source. Consumer integration must copy and verify the CSS in each product repository; a passing design-system test alone does not prove all ten products have adopted it.
