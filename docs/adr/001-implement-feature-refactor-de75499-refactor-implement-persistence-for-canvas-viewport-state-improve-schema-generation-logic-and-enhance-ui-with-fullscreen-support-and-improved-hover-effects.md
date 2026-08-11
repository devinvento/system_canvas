# ADR 001: Implement Feature: REFACTOR [de75499]: Viewport Persistence, Schema Generation, and UI Enhancements

Date: 2026-08-11
Status: Accepted

## Context
The System Canvas interface required enhancements to improve the visual experience and secure schema deployment within ERPNext/Frappe.
1. **Viewport Persistence**: Zoom levels and pan positions did not persist, forcing users to re-align the canvas upon reload.
2. **Schema Safety & Permissions**: The Custom DocType generator lacked overrides protection for standard DocTypes and did not assign default permissions to System Managers.
3. **Clipping & Overlaps**: Arrowheads slipped under borders when the SVG layer was rendered underneath cards, and S-curve lines looped backwards when cards were vertically close or overlapping.

## Decision
1. **Viewport Persistence**: Integrated `localStorage` hooks for zoom and pan states, bound to the project name, restoring coordinates instantly upon project load.
2. **Dominant Axis Port Routing**: Dynamically select side ports (left/right) for horizontal layouts, and boundary ports (top/bottom) with a `6px` path offset for vertical alignments to ensure arrowheads are fully visible outside card borders.
3. **Layering & Card Opacity**: Elevated the SVG overlay to `z-index: 15` and changed card backgrounds to solid Slate colors (`#1E293B`) to eliminate bleed-through and line clipping.
4. **Custom DocType Sync Guard**: Enhanced `generate_frappe_doctypes` in `api.py` to prevent standard DocType overwriting and automatically generate read/write/create/delete permissions for the `System Manager` role.

## Consequences
- **Benefits**: Improved UX navigation state stability, complete visual cleanup (no overlapping lines on card text), and robust schema deployment to the Frappe database.
- **Trade-offs / Risks**: High density layout may require larger screen space; resolved by adding fullscreen toggle overlays.
