# Product observability and Function analytics

## Implementation status

The initial end-to-end slice is implemented in the TypeScript SDK, legacy and Nest logs services,
legacy and Nest proxy allowlists, MCP, and Workbench. Remaining delivery gates below cover load,
deployment, and production data validation rather than missing wiring.

## Outcome

Give operators and AI agents one bounded, filterable path from a product-level regression to the
exact Feature run, portable Function invocation, nested primitive, healthcheck, session/user, and
redacted diagnostic that explains it.

## Shared event contract

Use the existing log/processor-result pipeline as the canonical execution source. Every record
must carry the fields that apply to it:

- `workspace_id`, `product_id`, `product_tag`, `env`
- `process_id`, `trace_id`, `parent_process_id`
- `component`, `type`, `status`, `start`, `end`, `latency`
- `feature_id`, `feature_tag`, `feature_run_id`, `step_tag`
- `function_id`, `function_tag`, `function_version`, `function_transport`, `function_location`
- `parent_tag`, `child_tag`, `action`, `method`
- `session_id`, `session_tag`, `session_user_id`, `visitor_id`
- encrypted/redacted `input`, `result`, and structured `error`

Writes and indexes must preserve these fields; the read API must not infer Function identity by
searching payload strings. Add compound indexes for product/environment/time, function/time,
feature-run/step, process correlation, session/time, status/time, and healthcheck/environment/time.

## Read API

Add a versioned product-observability endpoint with bounded pagination and server-side aggregates:

`GET /log/v1/products/:productTag/observability/:workspaceId`

Filters: `env`, `from`, `to`, `component`, `status`, `feature_tag`, `function_tag`, `session_id`,
`process_id`, `page`, and `limit`. Return coverage metadata, totals, error rate, p50/p95/p99 latency,
throughput, slow/failing operation groups, health transitions, and a paginated run summary. Add
drill-down endpoints for one process/run and one Function. Never make Workbench download all logs
to calculate dashboard metrics.

## Workbench

1. Add a Product **Observability** view with time range, environment, component, status, Feature,
   Function, and session filters. Cards show real totals, error rate, throughput, p50/p95/p99, and
   health state; charts show volume, latency, failures, and health transitions.
2. Add **Functions** as a first-class product resource. Its explorer shows invocation volume,
   success/error rate, p50/p95/p99, transport/location/version distribution, recent invocations,
   callers (Features/steps), and downstream primitive spans.
3. Reuse the same process/run drawer for Feature, Function, session, and health views. Show the
   correlated timeline and redacted input/output/error, with links in both directions.
4. Empty states must distinguish `no records`, `filters excluded records`, `ingestion delayed`, and
   `source unavailable`. Display coverage and latest-ingested timestamps.

## MCP

`ductape_observability_report` is the bounded first-line diagnostic. It must summarize rather than
dump raw catalogues, disclose unavailable sources/sample limits, rank slow and failing operations,
and preserve correlation identifiers. Follow it with targeted log/run lookups only when the summary
identifies a candidate. MCP must never expose credentials or unredacted secret-bearing payloads.

## Delivery gates

- Contract tests prove every SDK emits Function, Feature, session, and nested primitive identity.
- Backend parity tests cover both legacy and Nest implementations.
- Query plans use the intended indexes and stay within an agreed latency budget at production-like
  cardinality.
- Workbench tests cover filters, deep links, pagination, empty/error states, and encrypted payloads.
- MCP tests use fixtures for healthy, failing, slow, partial-coverage, and empty products and assert
  bounded output.
- Roll out behind a read-only flag, backfill only identifiers that can be derived unambiguously, and
  compare old/new aggregates before making the dashboard canonical.
