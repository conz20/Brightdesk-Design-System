# Brightdesk Design System

The original visual and interaction foundation shared by all ten Brightdesk products.

> **Status:** Bootstrap repository — implementation not yet present.

## Purpose

Maintain one consistent Brightdesk design language while allowing each product to have its own icon, accent and domain-specific workspace. The Suite and product repositories remain the source of truth for their existing UI until components are migrated through reviewed pull requests.

## Current status

The verified repository currently contains only this README. No design tokens, component source, package manifest, visual test suite or published package has been confirmed.

## Planned foundations

- Design tokens for colour, typography, spacing, radius, elevation and motion.
- Accessible buttons, inputs, menus, tabs, dialogs, tables and navigation.
- Shared layout primitives and responsive breakpoints.
- Keyboard focus, high contrast, reduced motion and readable scaling.
- Theme support with a consistent cross-platform baseline.
- Original Brightdesk icon rules and product-specific identity.
- Visual regression fixtures and component usage examples.

## Design rules

Brightdesk must use its own wordmark, icons, illustration, copy, colour relationships and screen composition. Familiar productivity conventions are acceptable, but do not copy another vendor's distinctive artwork or exact interface layout. Do not use generic emoji as product icons.

## Initial acceptance gate

Create token definitions and one documented component first. Add accessibility and visual tests, then migrate one existing Suite/product component at a time. A component is not shared until at least one real consumer imports the versioned package and passes its tests.

The approved Suite visual standard remains authoritative until a reviewed update is merged. This repository's existence alone does not change product styling.