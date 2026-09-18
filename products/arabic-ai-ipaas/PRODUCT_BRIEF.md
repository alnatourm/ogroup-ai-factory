# Arabic AI iPaaS — Product Brief v0.1

## Product thesis
Arabic AI iPaaS is the Arabic intelligence layer between Arabic-speaking people, business systems, workflows, and any AI model or agent.

The platform does **not** replace the customer's AI. It makes the customer's AI understand and operate reliably in Arabic.

## Geographic scope
Arabic-speaking markets across MENA, not Saudi Arabia only.

## Primary value
Arabic is still operationally difficult across AI agents, business automation, documents, dialects, RTL content, business terminology, privacy, and structured workflow intent.

The platform provides a reusable Arabic-native layer that can sit between:
- people and AI agents
- business systems and AI
- Arabic documents and downstream software
- workflow engines and AI providers

## Core design principle
**BYOAI — Bring Your Own AI.**

Customers can connect:
- OpenAI-compatible models
- Gemini
- Claude
- Groq
- private/local models
- enterprise-hosted models
- custom agents

The platform owns the Arabic intelligence and workflow layer, not the customer's model choice.

## Product pillars
1. Arabic AI Gateway
2. Arabic Automation Engine
3. Arabic Document Intelligence
4. Arabic Business Semantics / Action Layer
5. Privacy-safe Arabic Data Flywheel

## Initial users
### Developer / AI Team
Connects an existing agent or application to the Arabic Gateway API.

### Business Automation User
Builds workflows using Arabic natural-language instructions.

### Enterprise Admin
Controls tenants, integrations, data policy, model routing, audit logs and deployment mode.

### Partner / Agency
White-labels the platform and manages multiple customer workspaces.

## Example
Arabic input:

> إذا وصل عرض سعر من المورد وكان المبلغ فوق 10000 ريال أرسله للمدير للموافقة.

Structured intent:

```json
{
  "trigger": "supplier_quote.received",
  "condition": {
    "amount": { "operator": ">", "value": 10000, "currency": "SAR" }
  },
  "action": {
    "type": "request_manager_approval"
  }
}
```

## Strategic asset
The platform should build a proprietary Arabic intelligence corpus from privacy-safe and properly licensed learning signals, including:
- Arabic -> normalized Arabic
- dialect -> MSA
- Arabic business instruction -> structured intent
- Arabic workflow request -> workflow graph
- Arabic OCR output -> corrected text
- Arabic business term -> canonical concept
- Arabic prompt -> optimized prompt
- Arabic document section -> semantic class

Raw private customer content is not automatically training data.

## Non-goals for v0.1
- building a frontier foundation model
- replacing Zapier/Make/n8n in every generic integration use case
- supporting every Arab-country connector on day one
- claiming guaranteed token-cost savings before benchmarking
- training on customer private data without explicit lawful permission

## Commercial direction
The platform can evolve into:
- SaaS
- API gateway
- white-label agency platform
- enterprise/private-cloud appliance
- developer infrastructure

## Factory decision
This product is selected as **Product #2**, the first end-to-end proof product for OGroup AI Factory V1.
