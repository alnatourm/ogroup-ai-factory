# Factory Agent Registry v0.1

This file records **actual execution assignments**, not aspirational agent names.

| Factory job | Primary executor | Current reality | Fallback | Verification |
|---|---|---|---|---|
| Orchestration | OGroup Factory Orchestrator | Implemented controller | none | orchestration state + tests |
| Product definition | Product Generator / Factory logic | Implemented deterministic Factory logic; not a separate connected LLM | approved General Factory Agent when configured | requirements/acceptance review |
| Architecture | Orchestrator architecture stage | Stage defined; no separate external AI adapter recorded here | approved General Factory Agent when configured | ADR/architecture review |
| Design | Google Stitch via StitchDesignAdapter | Connected adapter contract | none until configured | Design Review + human design approval |
| Design Review | OGroup Design Review Agent | Implemented structural/content review | human review | review evidence + human approval |
| Build | Google Antigravity Build Agent | Concrete BuildAgent implementation | alternative BuildAgent when configured | tests + CI + review |
| QA | CI/tests + Orchestrator QA stage | Verification machinery; no separate QA LLM required | General Factory Agent may diagnose, not self-certify | independent tests/CI |
| Security | security rules/checks + Orchestrator stage | Verification stage; specialist adapter may be added later | human/security review where required | security evidence |
| Engineering Review | Factory/CI/human gate | No separate external reviewer recorded here | approved General Factory Agent when configured | review evidence |
| Release | Factory release controller + human authority | Controlled stage | none | release gates + human production approval |

## Registry rules

1. Job and provider are separate concepts.
2. Providers are replaceable behind stable Factory contracts.
3. A fallback can run only with the required capability, tools and permissions.
4. Missing capability must produce an explicit configuration/stalled state, never a false PASS.
5. Provider completion does not equal Factory completion.
6. Update this registry whenever a real executor is connected, removed or materially changes capability.
