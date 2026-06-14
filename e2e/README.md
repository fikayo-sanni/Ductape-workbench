# Workbench E2E tests (Playwright)

End-to-end tests for **Ductape Workbench** (`platform/workbench`). They run in a real Chromium browser against the Vite app on port **4310**, with optional calls to the API gateway on **4311**.

## What is covered

| Suite | Auth | Backend | Description |
|-------|------|---------|-------------|
| `smoke/app-shell.spec.ts` | No | No | Login modal, password validation, signup query param |
| `smoke/marketplace-public.spec.ts` | No | Mocked | Public marketplace list, search, routes |
| `smoke/login-api.spec.ts` | No | Live | Full UI login (needs `E2E_EMAIL` / `E2E_PASSWORD`) |
| `auth/*.spec.ts` | Yes (API setup) | Live | Sidebar, dashboard tab, session persistence |

## Prerequisites

- Node **20.x** (matches `package.json` engines)
- API gateway + dependent services for **live** tests (`E2E_API_BASE_URL`, default `http://localhost:4311`)
- A **verified** test user for authenticated flows (accounts pending OTP will fail API setup)

## Setup

```bash
cd platform/workbench
npm install
npm run test:e2e:install   # Chromium only

cp .env.e2e.example .env.e2e
# Edit .env.e2e with test credentials
```

Load env vars when running (example):

```bash
set -a && source .env.e2e && set +a
npm run test:e2e
```

## Commands

| Script | Purpose |
|--------|---------|
| `npm run test:e2e` | Run all projects (setup + smoke + auth) |
| `npm run test:e2e:ui` | Interactive UI mode |
| `npm run test:e2e:headed` | Visible browser |
| `npm run test:e2e:debug` | Playwright debugger |
| `npm run test:e2e:report` | Open HTML report after a run |

Run only smoke tests (no credentials required for most):

```bash
npx playwright test --project=chromium
```

Run only authenticated tests:

```bash
npx playwright test --project=chromium-authenticated
```

If the dev server is already running:

```bash
E2E_SKIP_WEB_SERVER=1 npm run test:e2e
```

## `data-testid` conventions

Stable selectors live on critical UI:

- `login-modal`, `login-email`, `login-password`, `login-submit`
- `workbench-shell`, `workbench-header`, `icon-sidebar`, `icon-sidebar-{view}`
- `marketplace-header`, `marketplace-search`
- `create-account-modal`, `tab-bar`

Prefer `getByTestId()` in new tests; use roles/labels when test ids are not available.

## CI

See `.github/workflows/workbench-e2e.yml`. Smoke tests with mocked marketplace run without secrets. Authenticated jobs need `E2E_EMAIL` / `E2E_PASSWORD` repository secrets.

## Adding tests

1. Add `data-testid` on new interactive UI where possible.
2. Put unauthenticated / mocked tests under `e2e/smoke/`.
3. Put tests that need a real session under `e2e/auth/` (they use `storageState` from `e2e/auth.setup.ts`).
4. Use `mockMarketplaceApis(page)` from `helpers/mock-marketplace.ts` when the API is not required.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `login failed` in setup | Check API is up; user must be verified |
| Port 4310 in use | Stop other dev server or set `E2E_BASE_URL` |
| Flaky dashboard tab | Increase timeout; ensure workspace has data |
| CORS / network errors | Set `VITE_API_BASE_URL` to gateway; avoid proxy mismatch |
| `Executable doesn't exist` (Cursor sandbox) | Run `env -u PLAYWRIGHT_BROWSERS_PATH npx playwright install chromium` then test with the same unset env |
