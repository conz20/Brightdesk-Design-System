# Brightdesk Product Experience Standard

Status: mandatory portfolio requirement
Owner: Brightdesk Design System
Applies to: Brightdesk Office Suite and all ten customer products
Benchmark: Microsoft Office desktop applications and Microsoft's published Fluent / Windows application guidance
Brand rule: original Brightdesk identity only

## 1. Product promise

Brightdesk must deliver the clarity, depth, consistency, polish and dependable desktop behaviour people expect from a mature Microsoft-quality productivity suite. Microsoft is the functional and experience benchmark, not a source of copied branding, artwork, code or distinctive screen compositions.

Preserve the existing Brightdesk Office Suite identity and its Home / Apps / Files / product-launcher role. Professionalise its hierarchy, spacing, typography, navigation, status feedback and application cards so it belongs to the same product family as the ten individual applications.

Do not redesign the Suite into a different product merely to imitate a reference screen.

## 2. Suite and application window model

The Suite is the central launcher and management centre. Each of the ten products is an independently launchable desktop application.

Required behaviour:
- Selecting Open for a product launches or focuses that product's own application window. It must not merely change the selected product inside the Suite window.
- Each product window has its own correct product name, icon, operating-system window identity, workspace, navigation, commands and settings.
- Reopening an already-running product focuses its existing window instead of creating duplicate windows, unless an explicitly supported new-window action is chosen.
- Closing a product window does not unexpectedly close the Suite or another product.
- The Suite remains available as the home/launcher and provides a clear way to open or focus installed products.
- Product switching must respect installed/available state and must never launch a product that is not installed or is not yet available.
- Window lifecycle, focus, close, reopen, crash recovery and unsaved-work behaviour must be defined and tested on Windows, macOS and Linux.
- Product windows must open directly into the requested product, not a generic Suite screen.
- Application-specific document state and settings must remain correctly isolated; shared services may be reused without merging product identities.

## 3. Shared Brightdesk experience

All ten products must use the shared design foundation while retaining product-specific workspaces.

The shared foundation must define and verify:
- Original Brightdesk colour, typography, spacing, sizing, elevation, borders, focus and motion tokens.
- Consistent title bars / product identity, navigation patterns, command surfaces, menus, dialogs, tooltips, context menus, status bars and notifications.
- Clear information hierarchy, professional density, alignment and predictable placement of common commands.
- Consistent file operations, save state, unsaved-change prompts, undo/redo, search, selection, clipboard, import/export and print behaviour where relevant.
- Consistent settings organisation, keyboard shortcuts, command discovery, help/about, recovery and error handling.
- Light/dark/high-contrast or platform-appropriate appearance only where implemented and tested; do not display nonfunctional theme choices.
- Responsive desktop layouts for supported window sizes and scaling; no clipped commands or inaccessible overflow.
- Windows, macOS and Linux conventions should be respected rather than forcing identical platform chrome where native behaviour differs.

Shared components must be implemented once where practical and integrated into each product. Do not create ten incompatible versions of the same control.

## 4. Microsoft benchmark and feature-gap review

Before declaring a product experience complete, compare it against the current Microsoft desktop equivalent and the relevant official Microsoft documentation.

For each product, create a feature-and-workflow matrix that records:
1. Microsoft capability or interaction being assessed.
2. Whether it is relevant to Brightdesk's product purpose.
3. Whether it is compatible with Brightdesk's local-first, free-forever and privacy requirements.
4. Current Brightdesk status: implemented and verified, partial, missing, not applicable, or deliberately excluded.
5. Evidence, tests and remaining work.

Do not stop at a visual comparison. Inspect complete workflows: create, open, edit, navigate, search, format, organise, save, reopen, export, print, undo/redo, recover and close, as applicable to that product.

When Microsoft has a relevant desktop capability that Brightdesk lacks, record it as a gap and implement it when it is technically and legally appropriate. Do not silently omit a capability because it was not in the original feature list.

The benchmark is not a command to reproduce every Microsoft service. Exclude or redesign capabilities that require subscriptions, customer accounts, remote AI, cloud storage/sync, telemetry, advertising, online collaboration, proprietary Microsoft services, or other functionality prohibited by Brightdesk's product rules. Preserve equivalent local/offline workflows where feasible.

## 5. Product-specific capability expectations

These are capability review areas, not claims that all features are already implemented.

### Pages
Professional word-processing workflows: page layout, margins, orientation, sizes, columns, rulers, styles, templates, headers/footers, page numbers, sections, tables, images, shapes, links, footnotes/endnotes, references, spelling/proofing, word count, print preview, printing, export and document recovery.

### Sheets
Spreadsheet workflows: formula bar, cell/range selection, formulas and function library, relative/absolute references, formatting, number formats, tables, sorting/filtering, conditional formatting, validation, freeze panes, charts, named ranges, multiple sheets, print layout, import/export and calculation feedback.

### Decks
Presentation workflows: slide thumbnails, layouts, themes, masters, rich text and shape formatting, image/media insertion where supported, transitions, animations, speaker notes, presenter view, slide show controls, export and print handouts.

### Notes
Notebook, section and page organisation; rich text; lists; images/attachments where supported; search; tagging or equivalent organisation; quick capture; print/export; and reliable local persistence.

### Database
Database creation and management; table and field design; data types; primary keys; relationships; queries; forms; views; sorting/filtering; validation; import/export; integrity feedback; and safe local backup/recovery.

### Forms
Form design; question types; validation; choice settings; sections and branching; preview; local response capture; response review and export; and accessible respondent workflows. No remote hosted forms or collection service unless explicitly approved under Brightdesk's product rules.

### Lists
Structured lists; custom columns and field types; views; sorting/filtering; grouping; item editing; validation; templates where justified; local import/export; and accessible table/grid interactions.

### Planner
Boards, buckets, tasks, due dates, priorities, progress, labels, calendar/schedule views, filters, task detail, dependencies where justified, local project organisation and export. No remote team assignment or collaboration service.

### To Do
Fast task capture; lists; My Day; planned and important views; due dates; reminders where supported locally; recurrence where supported; search, filters, completion, prioritisation, keyboard operation and local persistence.

### Workspace
A structured project workspace with pages, content blocks, notes, checklists, embedded local Brightdesk documents or references where supported, navigation, search, organisation, export and reliable local persistence. Do not imply cloud collaboration or real-time shared workspaces.

## 6. Accessibility and usability

Accessibility is a release requirement, not a visual polish phase.

- Full keyboard operation for every core workflow.
- Logical focus order, visible focus, focus restoration after dialogs and accessible names/roles/states.
- Screen-reader support and meaningful headings/landmarks.
- Text and control contrast meeting WCAG AA targets.
- Scaling and zoom without clipping or loss of functionality.
- Reduced-motion support.
- Clear, concise and consistent interface language.
- Error messages explain what happened and how to recover.
- Do not rely on colour, hover, icon-only meaning or pointer gestures alone.

## 7. Real functionality and truthful presentation

- Every visible command must work or be clearly disabled with a meaningful explanation.
- Do not show fake, decorative, placeholder or aspirational controls as implemented functionality.
- Do not advertise a capability until it passes functional tests.
- Screenshots must come from the actual application build and show the exact tested state.
- Concept artwork must be labelled as concept artwork and must never be presented as a running application screenshot.
- Product READMEs must distinguish implemented, partial and planned capabilities.
- Keep product artwork, SVGs, icons and screenshots original, approved, licensed and traceable through Brightdesk-Assets.

## 8. Automated enforcement

The shared design-system and repository CI must progressively enforce:
- Design-token and shared-component conformance.
- Product window identity and independent launch behaviour.
- No accidental Suite-internal product switching in place of independent launch.
- Product launch/focus/reopen/close lifecycle tests.
- Accessibility checks for names, roles, keyboard access, focus, contrast and scaling where automation is reliable.
- No dead buttons, placeholder handlers or unlabelled disabled actions in shipped UI.
- No broken README image links, unapproved media, concept art presented as screenshots, or screenshot claims without build/test evidence.
- No prohibited Microsoft/Adobe branding, copied proprietary assets or dependencies.
- No network dependency in normal product operation and no prohibited telemetry, ads, customer accounts or remote AI.
- Node.js 24.22.2 and the currently approved Brightdesk toolchain; do not downgrade runtimes to make checks pass.

CI must fail on enforceable violations. Any exception must be documented, scoped and reviewed rather than silently bypassed.

## 9. Acceptance gates

A product is not considered complete merely because it launches or resembles a reference screenshot. It must pass:
1. Product-specific feature/workflow gap review.
2. Visual consistency and usability review.
3. Functional tests for every advertised core workflow.
4. Keyboard and assistive-technology checks.
5. File integrity, local persistence, import/export and print checks where applicable.
6. Independent product-window lifecycle tests.
7. Windows, macOS and Linux verification.
8. Real screenshots captured from the verified build.
9. README and asset validation.
10. Regression tests proving the shared standards remain enforced.

## 10. Official benchmark references

Use current official guidance and product documentation; re-check it during each major review:
- Fluent 2 design system: https://fluent2.microsoft.design/
- Fluent accessibility: https://fluent2.microsoft.design/accessibility
- Windows app design basics: https://learn.microsoft.com/en-us/windows/apps/design/basics/
- Windows app design guidance: https://learn.microsoft.com/en-us/windows/apps/design/
- Windows keyboard accessibility: https://learn.microsoft.com/en-us/windows/apps/design/accessibility/keyboard-accessibility
- Microsoft Office desktop feature comparisons: https://support.microsoft.com/en-us/word/word-features-comparison-word-for-the-web-vs-desktop.
- Microsoft Office service/desktop feature descriptions: https://learn.microsoft.com/office365/servicedescriptions/office-online-service-description/office-online-service-description

This standard is the portfolio-wide source of truth. Product READMEs, implementation briefs, design reviews, tests and release checks must align with it.
