# GitHub Task Emitter v0.1

The task emitter converts an OGroup orchestrator plan into GitHub-ready engineering issue definitions.

It produces ordered tasks with agent roles, dependencies, acceptance criteria, evidence requirements, security/testing expectations, labels, and human-gate markers.

## Important boundary
The emitter is pure planning logic. It does **not** create GitHub issues itself. Repository mutation is a separate explicit adapter/action so deterministic planning can be tested without granting the planner authority over GitHub.

Generated tasks never grant merge or production authority. Human-gated stages remain human-controlled under the Engineering Constitution.
