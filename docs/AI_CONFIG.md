# AI Configuration Guide

## How The AI Assistant Works

The assistant is built from four layers that are assembled by the backend:

1. Backend-managed prompt preset
2. Provider-level system prompt
3. Selected data-source profile summaries
4. The current user request

This means the user prompt is never sent alone. The selected preset gives the AI a stable enterprise role, the provider prompt adds endpoint-specific guidance, and the profiled sources keep the answer grounded in real business data.

Every successful chat or analysis response returns:

- natural-language content
- intent judgement
- suggested analysis template
- structured follow-up actions

Those follow-up actions are designed so the frontend can route users to the most relevant page or workflow without guessing from unstructured prose.

## Supported Provider Shape

- Any OpenAI-compatible endpoint that exposes `/v1/chat/completions`
- Required fields:
  - `baseUrl`
  - `chatModel`
- Usually required:
  - `apiKey`
- Optional:
  - `embeddingModel`
  - `systemPrompt`

## Recommended Starting Configurations

- OpenAI:
  - Base URL: `https://api.openai.com/v1`
  - Chat model: `gpt-4o-mini`
  - Embedding model: `text-embedding-3-small`
- LM Studio or Ollama with OpenAI compatibility enabled:
  - Base URL: your local `/v1` endpoint
  - Chat model: the exact model id shown by that runtime

## Strict Real Mode Rules

- The platform no longer returns fabricated local AI answers.
- If the provider is invalid, unreachable, or points back to the platform itself, the request fails with a remediation message.
- The local `/v1/chat/completions` route is only valid when you explicitly configure an upstream provider through environment variables for proxy mode.
- If the provider returns non-JSON text for a structured analysis or action-routing request, the platform fails fast and tells you to use a stronger instruction-following model.

## Common Problems and Fixes

- `HTTP 401` or `HTTP 403`
  - Verify the API key and model access rights.
- `HTTP 404`
  - Verify the base URL ends at `/v1` and the model route is supported.
- `The provider points back to the local AI/ML service`
  - Replace the endpoint with a real OpenAI-compatible service such as OpenAI, Azure OpenAI, LM Studio, or Ollama.
- `The AI provider returned text that could not be parsed into the required analysis JSON schema`
  - Use a stronger instruction-following model and keep the system prompt focused on JSON output.
- `The AI provider returned text that could not be parsed into the required chat JSON schema`
  - Use a model that reliably follows JSON instructions and avoid adding extra prose to the provider-level system prompt.

## Recommended Prompt Presets

| Preset | Purpose | Best page |
| --- | --- | --- |
| `quality-ops-briefing` | frontline quality explanation and next-step guidance | `/ai-assistant` |
| `report-author` | export-ready diagnosis and report writing | `/reports` |
| `training-advisor` | dataset readiness and YOLO run planning | `/training` |
| `dashboard-operator` | route the user toward the right enterprise page or action | `/workspace` or `/operations` |

## Security Notes

- API keys are stored only on the backend.
- Keys are encrypted using `APP_SECURITY_SECRET`.
- Frontend only receives masked values.
