# Stitch Design Agent Adapter v0.1

## Purpose

Connect Google Stitch to OGroup AI Factory as the execution tool used by the Design Agent.

The Factory remains the decision maker. Stitch is a tool under the Design Agent.

```text
Product Agent
  -> Architecture Agent
  -> Design Agent
       -> StitchDesignAdapter
            -> Stitch agent tools
            -> generated screens
            -> HTML/screenshot references
  -> Build Agent
```

## Authentication

The adapter requires one secret in the execution environment:

```text
STITCH_API_KEY
```

Never commit this value to GitHub and never place it in prompts, logs, issue bodies, or product artifacts.

OAuth can be added later behind the same adapter boundary.

## Required Stitch tools

The adapter validates these tools before work begins:

- create_project
- generate_screen_from_text
- get_screen

If they are unavailable, the Factory must stop the Design stage as `NEEDS_FACTORY_CONFIGURATION` instead of pretending design completed.

## Factory contract

Input:

- product id
- Stitch project title
- ordered screen specifications
- prompt for each screen
- device type

Output:

- Stitch project id
- generated screen id
- HTML asset URL when exposed by Stitch
- screenshot asset URL when exposed by Stitch
- `DESIGN_GENERATED` state

Generation alone is not Design PASS. A review/evaluation layer must inspect the returned screens against product and architecture acceptance criteria before the Factory advances to Build.

## V0.1 scope

This first adapter deliberately uses the dynamic Stitch tool client rather than coupling Factory logic to a fixed REST schema.

This lets Stitch evolve while Factory only depends on the tool contract.

## Next step

Wire the Arabic AI iPaaS Design Request into this adapter, execute it with a configured `STITCH_API_KEY`, review returned screenshots, iterate where required, and only then mark the Design gate PASS.
