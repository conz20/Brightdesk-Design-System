# Brightdesk Microsoft-Quality Product Parity Standard

**Status:** Proposed canonical engineering and design requirement  
**Applies to:** Brightdesk Suite, all ten customer products, Brightdesk-Design-System, shared libraries/actions, packaging, documentation and release verification  
**Benchmark:** The completeness, usability, consistency and professional finish of Microsoft desktop productivity applications  
**Brand rule:** Brightdesk must remain an original product family. Microsoft is a quality and workflow benchmark, not a source of copied branding, proprietary assets, source code or distinctive screen compositions.

## 1. Governing principle

Every Brightdesk customer application must feel like a complete, dependable desktop productivity application, not a prototype, web form, demo screen or thin editor. Evaluate the product against the relevant capabilities and interaction conventions Microsoft provides in comparable desktop productivity software.

Do not omit a relevant, useful capability merely because it has not yet been designed in Brightdesk. Record it, assess it for the relevant product, and implement it when it fits the product's purpose and Brightdesk's binding constraints.

Do not add a feature merely because it is technically possible. It must serve a real user task, be discoverable, accessible, complete, tested and consistent with the product.

A control must work. If a capability is not implemented, do not display a misleading enabled control or claim it exists. Use a clear disabled/coming-later state only where that state is useful and approved; otherwise omit it.

## 2. Product and Suite architecture

The Suite is the application launcher and management centre. It is not a substitute for the ten product applications.

- Selecting **Open** for a product launches that product as its own independently identifiable desktop application/window.
- Each product has its own application identity, title, icon, workspace, navigation, settings context and supported document/file workflows.
- Product launch must pass a validated product identifier to the correct product entry point. Unknown, unavailable or uninstalled products must fail safely with a clear message.
- The Suite must not merely change an internal selected-product panel and claim that a separate application was opened.
- Users can launch multiple supported products, switch between them, close a product without losing unrelated work, and return to the Suite.
- The Suite must clearly distinguish install/open/manage actions and accurately reflect installed, available and in-development states.
- Window sizing, focus, keyboard navigation, close behaviour, startup behaviour and platform conventions must be verified on Windows, macOS and Linux.
- Product data remains local to the device. Product switching must not silently move, upload or expose document content.

## 3. Microsoft-quality desktop application foundations

Assess each capability against the product's actual purpose. Implement relevant capabilities; do not force identical feature sets on unrelated products.

### Application frame and navigation
- Clear product identity and application title.
- Consistent window frame, navigation hierarchy, workspace and status information.
- Predictable menus, command groups, toolbars and context-sensitive actions.
- A ribbon or equivalent command surface where it materially suits the product; contextual tabs/groups appear only when relevant.
- Persistent, understandable navigation with clear selected, hover, focus, disabled and unavailable states.
- Responsive desktop layout that uses available window space without clipping, accidental horizontal overflow or unusable controls.
- Useful window resizing and appropriate minimum dimensions.
- No decorative controls, unexplained icons or duplicate navigation.

### Commands and editing
- Product-appropriate command groups and contextual actions.
- Keyboard shortcuts for common and power-user operations, with discoverability and no conflicting bindings.
- Undo/redo for meaningful editing operations, with clear boundaries and tests.
- Reliable clipboard operations where relevant, including plain text and supported rich/formatted content.
- Selection, multi-selection, drag/drop and context menus where they improve the real workflow.
- Search/find, replace, filtering or navigation appropriate to the product.
- Useful command/help search where it can operate locally and does not require remote AI or telemetry.
- Consistent confirmation for destructive actions and safe cancellation.

### Files, documents and persistence
- Clear New, Open, Save, Save As, close and export workflows appropriate to each product.
- Explicit supported file formats and truthful compatibility claims.
- Local autosave or recovery where appropriate, with visible save status and robust handling of interrupted writes.
- No silent data loss; protect unsaved changes and explain recovery choices.
- Recent files and templates only when implemented, stored locally and privacy-safe.
- Import/export must validate inputs, report errors clearly and avoid corrupting source files.
- Printing and print preview where relevant, using the operating system's supported print facilities.
- Document and project settings must be understandable and persist predictably.
- Local backups/recovery/version history may be implemented where useful; they must remain local and must not imply cloud sync.

### Product-specific depth
- Pages: professional document editing, styles, typography, page layout, sections, headers/footers, tables, lists, links, images, references where supported, proofing, print and export.
- Sheets: formula bar, formula/function support, cell/range selection, formatting, references, sorting/filtering, tables, charts, data validation and workbook/sheet management where supported.
- Decks: slide thumbnails, layouts, themes, objects, alignment, notes, transitions/animations where supported, presenter and slideshow workflows, export and print.
- Notes: notebooks/sections/pages or an equally clear hierarchy, rich note content, search, organisation, attachments where supported and quick capture.
- Database: schema/table design, field types, records, relationships, queries, validation, sorting/filtering and safe data import/export.
- Forms: question types, validation, sections/branching where supported, preview, local response collection and response analysis/export.
- Lists: configurable columns/field types, records, views, sorting, filtering, grouping and safe bulk operations.
- Planner: plans, buckets/columns, tasks, dates, priorities, progress, useful board/list/schedule views and local project organisation.
- To Do: task capture, completion, priorities, due dates, planned tasks, My Day or equivalent focus view, search and reliable reminders where supported.
- Workspace: organised project spaces/pages, linked local resources, reusable content blocks where supported, navigation and clear project-level organisation.
- These are capability assessment areas, not permission to advertise features that are not implemented and tested.

## 4. Accessibility, localisation and platform quality

- Full keyboard operation, logical tab order and visible focus.
- Semantic roles, accessible names, labels, instructions and status announcements.
- Screen-reader support verified with platform assistive technologies.
- Contrast, text scaling, zoom and reduced-motion support.
- Do not communicate status by colour alone.
- Correct focus handling for dialogs, menus, popovers and window changes.
- Localisation-ready strings, correct date/number conventions and language-aware text entry.
- Spellchecking and proofing must use the approved Brightdesk language-resource model.
- Correct input-method, Unicode, right-to-left and complex-script behaviour where supported.
- Native platform conventions for Windows, macOS and Linux without creating three inconsistent products.
- Handle high-DPI displays, display scaling, multiple monitors and window restoration appropriately.
- Clear error messages that explain what happened and what the user can do next.

## 5. Trust, privacy and local-first boundaries

The Microsoft benchmark does not override Brightdesk's approved product constraints. Brightdesk remains free forever and local-first.

Do not add:
- subscriptions, trials, paid tiers, billing or in-product purchases;
- customer accounts, sign-in, passwords, profiles, activation or licence servers;
- telemetry, analytics, advertising, crash reporting or behavioural tracking;
- cloud sync, remote storage, online collaboration or customer-content uploads;
- remote AI processing or remote AI features that transmit user content;
- runtime dependencies on GitHub/CDNs for product assets or application operation;
- Adobe applications, services, dependencies, integrations or Adobe-owned assets;
- Microsoft logos, product branding, proprietary artwork, source code or copied trade dress.

Permitted internet use remains limited to Brightdesk product updates and Brightdesk-controlled language-resource discovery, download and update. Any exception requires explicit approval and must not silently broaden these boundaries.

## 6. Shared Brightdesk experience

- Use the canonical Design System tokens, components, typography, focus, spacing, elevation and interaction patterns.
- Preserve product-specific accents and identities within the shared system.
- Use consistent menus, dialogs, notifications, empty states, errors, status indicators and settings patterns.
- Provide consistent app switching without confusing the Suite launcher with the product's own workspace.
- Keep each product specialised. Shared components must not flatten all products into the same generic editor.
- Settings must be placed where users expect them and must not be duplicated without a clear reason.
- Keep terminology, icons and command labels consistent across the portfolio.

## 7. Verification and release gates

A product is not Microsoft-quality merely because its README, mock-up or SVG looks polished.

For every product and the Suite:
1. Build and launch the actual desktop application.
2. Verify its correct product identity, independent launch path and window behaviour.
3. Exercise each advertised primary workflow end to end.
4. Verify file persistence, reopen, export and recovery behaviour where applicable.
5. Verify keyboard, accessibility, focus, scaling and platform behaviour.
6. Test error, empty, loading, cancellation and destructive-action states.
7. Capture genuine screenshots from the tested build, with build/version and test evidence.
8. Ensure README images match the actual current application and are not mock-ups presented as screenshots.
9. Run automated tests and CI using the repository's approved Node.js 24.22.2 runtime and current toolchain contract.
10. Record unsupported capabilities honestly; do not mark a product complete while a critical advertised workflow is broken.

CI should enforce what can be checked automatically: product identity/launch wiring, required accessibility hooks and tests, asset provenance, screenshot evidence metadata, README link validity, prohibited branding/dependencies and no placeholder or broken visual references. Manual platform and assistive-technology checks remain explicit release gates.

## 8. Ongoing Microsoft benchmark review

Review relevant current Microsoft desktop-product workflows and official design/accessibility guidance when planning or reviewing each product. Compare task completion, command discoverability, file handling, navigation, accessibility and error recovery.

Maintain a product-by-product gap register with:
- Microsoft reference capability/workflow;
- whether it is relevant to the Brightdesk product;
- Brightdesk decision: implement, adapt, defer or exclude;
- reason, including any conflict with Brightdesk constraints;
- implementation status and test evidence.

Do not blindly copy Microsoft's product boundaries or add unrelated Microsoft services. A capability that conflicts with Brightdesk's local-first/free/no-account rules must be excluded and documented even if Microsoft offers it.

## 9. Completion definition

A product is ready only when it is a coherent, independently launchable desktop application with a complete set of relevant working workflows, consistent Brightdesk design, platform/accessibility verification, trustworthy file handling, accurate documentation and genuine screenshots from a tested build.

A polished launcher or attractive mock-up alone is not completion.
