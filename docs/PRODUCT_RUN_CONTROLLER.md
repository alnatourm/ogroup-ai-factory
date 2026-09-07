# Product Run Controller v0.1

The Product Run Controller composes the OGroup factory pipeline into one governed run:

Product input → bootstrap → orchestration → GitHub task blueprint → optional approved issue creation.

## Dry run
When `approved` is false, the controller produces the full plan and task blueprint but creates no GitHub issues.

## Approved run
When `approved` is true, issue creation is delegated to the GitHub execution adapter. The controller does not bypass that adapter or expand its authority.

## Authority boundary
The controller cannot merge pull requests, deploy software, modify secrets, change branch protection, or grant itself production authority. Partial failures must be surfaced as partial failures and never reported as complete.
