# HTET KABAR AI Agent Architecture (Proposal)

**Status: design only — not implemented.** This document proposes a controlled integration for Google Gemini and n8n. It does not claim that an AI provider, n8n workflow, agent database, admin UI, or production credential is currently connected.

## 1. Goals and boundaries

The first release should help administrators with low-risk, reviewable work:

- Summarize application health and sanitized operational errors.
- Draft Burmese/English service descriptions, announcements, and support replies.
- Prepare operational reports from explicitly approved, aggregated data.
- Trigger allowlisted n8n workflows such as internal notifications.

The agent system must not independently:

- Approve/reject payments, issue refunds, or change order/payment status.
- Read payment receipt bytes, transaction references, customer phone numbers, or unrestricted customer records.
- Change credentials, permissions, payment accounts, database schema, or production configuration.
- Execute arbitrary SQL, shell commands, filesystem operations, or arbitrary URLs.
- Merge pull requests, push to the production branch, or deploy production.

A model response is untrusted input. A deterministic server-side policy layer must authorize every tool call; a model must never grant itself permission.

## 2. Proposed architecture

```text
Admin Dashboard
      |
      v
Admin-authenticated Agent API
      |
      +--> Task / Permission Policy
      |       |
      |       +--> Approval Gate (human admin)
      |       |
      |       +--> Agent Task Queue + Audit Events
      |
      +--> Provider Adapter ------> Google Gemini API
      |
      +--> Workflow Adapter -----> n8n HTTPS Webhook
                                      |
                                      +--> allowlisted workflow
                                      |
                                      +--> signed callback to Agent API
```

- **Admin Dashboard:** displays registered agents, enabled state, task status, recent sanitized events, and pending approvals.
- **Agent API:** accepts requests only from an authenticated admin session or a verified internal integration. Reuse the existing admin authentication and same-origin protections; do not expose provider keys to browser JavaScript.
- **Policy layer:** checks agent status, action allowlist, actor, scope, rate limit, data classification, and approval requirement before execution.
- **Gemini adapter:** sends only the minimum necessary prompt/context to the provider. Provider selection and model names are configuration, not trusted model output.
- **n8n adapter:** invokes fixed, named workflows over HTTPS. n8n receives scoped task payloads, not database credentials. It must not connect directly to the production database.
- **Callback verification:** n8n callbacks must use an HMAC signature, timestamp, unique event ID, replay window, and idempotency check. Reject unsigned, stale, duplicate, or malformed callbacks.

## 3. Proposed agent registry

Initial agent identifiers (all proposed):

| Agent | Initial scope | Default permission |
|---|---|---|
| `system-monitor` | Health summaries and sanitized error counts | Read-only |
| `content-assistant` | Draft Burmese/English copy | Draft only |
| `support-assistant` | Prepare support reply drafts | Draft only; no private order lookup |
| `business-reporter` | Approved aggregate metrics | Read-only, aggregated |
| `workflow-coordinator` | Start fixed n8n workflows | Allowlisted triggers only |

Every agent definition should include a stable ID, display name, description, provider, enabled flag, permitted tool IDs, data scope, per-minute/task limits, timeout, and configuration version. Do not store provider secrets in the registry or return them through the API.

All agents should be disabled by default until an administrator explicitly enables them after configuration and tests.

## 4. Proposed persistence model (not yet migrated)

Keep agent records separate from the current order/payment tables:

- `agent_definitions`: registered agent metadata and non-secret policy configuration.
- `agent_tasks`: requester admin ID, agent ID, task type, minimal input reference, status, idempotency key, created/updated timestamps, and expiry.
- `agent_approvals`: task ID, exact action/payload hash, requested permission, approver admin ID, decision, note, expiry, and decision timestamp.
- `agent_runs`: provider/workflow name, model/version, duration, outcome, sanitized error code, and token/cost metadata where available.
- `agent_events`: append-only security and lifecycle events without prompts containing customer data, secrets, receipt bytes, or raw provider responses.

Do not extend the current `admin_audit_logs` action constraint casually: it currently permits only order-status and payment-review actions. Agent events should have a separate schema and retention policy, with links to the admin actor and task.

Use foreign keys, bounded text lengths, indexes on status/created time, unique idempotency keys, and explicit retention. Never store raw secrets or payment evidence in prompts, task payloads, or logs.

## 5. Task lifecycle and human approval

Proposed lifecycle:

```text
queued -> running -> succeeded
                  -> failed
                  -> awaiting_approval -> running -> succeeded/failed
                  -> cancelled
```

An approval must bind to the exact action and payload hash, have a short expiry, and be usable once. If the action payload changes, the approval becomes invalid and a new approval is required. Record the approving admin and decision in an append-only event.

Require a human admin decision for any future action involving payment/order state, refunds, customer communications sent externally, payment-account changes, credential changes, database writes/deletes/migrations, or production GitHub/Render operations. The first release should not implement these tools at all; an approval screen alone is not sufficient protection.

## 6. Security requirements

1. Store `GEMINI_API_KEY`, `N8N_WEBHOOK_URL`, and `N8N_WEBHOOK_SECRET` only in the hosting provider's secret environment store. Never commit them, print them, or expose them to the browser.
2. Use separate least-privilege credentials for Gemini and n8n. Rotate them through the provider dashboard when required.
3. Use HTTPS, request timeouts, response-size limits, concurrency limits, per-admin rate limits, and provider cost ceilings.
4. Treat prompts, retrieved documents, webhook payloads, and model output as untrusted data. Ignore embedded instructions that request secrets, policy changes, or tool escalation.
5. Do not give agents database connection strings, arbitrary SQL, shell access, filesystem access, generic HTTP fetch, or unrestricted browser access.
6. Minimize data sent to providers. Prefer aggregate counts and sanitized error categories; do not send customer names, phone numbers, transaction references, or receipt images.
7. Redact authorization headers, cookies, API keys, connection URLs, prompt secrets, and personal data from logs.
8. Make provider failure fail closed: no fallback to a more privileged tool or automatic state mutation.
9. Require an explicit feature flag such as `AI_AGENTS_ENABLED=false` by default. Missing or invalid provider configuration must leave the agent feature disabled.
10. Apply a retention period to prompts and outputs; default to not persisting full prompts or raw model responses.

## 7. Proposed API surface (not implemented)

Admin-only endpoints:

- `GET /api/admin/agents` — list metadata and enabled state, never secrets.
- `PATCH /api/admin/agents/:id` — enable/disable within server policy.
- `POST /api/admin/agent-tasks` — enqueue an allowlisted task.
- `GET /api/admin/agent-tasks/:id` — inspect sanitized task status.
- `POST /api/admin/agent-tasks/:id/approve` and `/reject` — decide a pending approval.
- `POST /api/internal/agent-events/n8n` — accept only signed, replay-protected callbacks.

The internal callback route must not accept browser-cookie authentication as a substitute for signature verification. Every route needs explicit authorization, validation, bounded input, and tests.

## 8. Implementation and test sequence

1. **Foundation:** threat model, feature flag off by default, provider interface, policy module, and no-op/mock adapters.
2. **Persistence:** add reversible, idempotent migrations for registry, tasks, approvals, runs, and events. Back up and test migrations on a disposable database first.
3. **Read-only pilot:** health summaries and content drafts using synthetic or public data only. Keep Gemini and n8n disabled in production until credentials and callbacks are verified.
4. **Admin UI:** agent list, enable/disable, task history, and approval queue with clear actor/action/payload summary.
5. **Integration:** configure Gemini and n8n secrets in the provider dashboard; test HMAC, replay rejection, idempotency, timeouts, retries, and provider outage behavior.
6. **Security review:** verify no customer/payment data reaches prompts/logs, no agent can call unlisted tools, and no sensitive action runs without a fresh approval.
7. **Release:** run `npm run check`, `npm test`, synthetic integration tests, backup verification, and restore rehearsal before any separately approved production release.

Required tests include permission-denial cases, disabled-agent behavior, malformed and oversized input, HMAC mismatch, stale/replayed callbacks, duplicate idempotency keys, expired/changed approval payloads, provider timeout, sanitized errors, and proof that payment/order state cannot be changed by an agent.

## 9. Current implementation status

| Capability | Status |
|---|---|
| Admin authentication and same-origin protections | Existing application code; production login still unverified |
| Health endpoint and sanitized DB status | Existing PR code; production deployment not verified |
| Gemini provider adapter | Not implemented |
| n8n workflow adapter/webhooks | Not implemented |
| Agent registry/task/approval schema | Not implemented |
| Agent management UI | Not implemented |
| Agent permissions and audit events | Design only |
| Production AI credentials or connections | Not configured or verified |

This proposal is documentation only. It adds no database objects, routes, credentials, provider calls, n8n workflows, or production behavior.
