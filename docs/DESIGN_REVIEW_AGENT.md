# Design Review Agent v0.1

The Design Review Agent sits between Stitch generation and Build.

Flow:

Product → Architecture → Stitch Design Agent → **Design Review Agent** → Build

It prevents a generated screen set from becoming `DESIGN_PASS` merely because Stitch returned files.

## v0.1 checks

- expected screen coverage
- Stitch project/screen identity
- generated HTML availability
- Arabic content presence
- explicit RTL behavior
- obvious interactive controls
- responsive viewport
- credential-like value leakage

The agent returns either:

- `DESIGN_PASS`
- `DESIGN_REVISION_REQUIRED`

## Current limitation

v0.1 is a structural/content reviewer. It does not yet make pixel-level visual judgments because the current Stitch adapter receives HTML download URLs but no screenshot URLs. Visual review will be added as a second layer when rendered screenshots are available.
