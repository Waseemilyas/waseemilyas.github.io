# Visitor journey (read-only)

Playwright exercises the main pages at desktop and phone widths, checks headings,
overflow and runtime errors, opens and closes the phone drawer, follows primary
navigation to Work, and selects capabilities with pointer and keyboard. It checks
the exact revision endpoint and each page's revision metadata.

The browser permits GET/HEAD requests to the chosen origin only. Redirects,
external requests, writes, service workers and WebSockets are blocked. It never
submits forms or opens mail links.

Isolated from the site package (root lockfile untouched):

    pnpm install --frozen-lockfile
    pnpm build
    cd e2e && npm ci && npx playwright install chromium

Choose a free private loopback port and name the full SHA used by the build.
`E2E_SERVE=1` lets Playwright serve `_site/` and stop its server afterwards. It
refuses to reuse another server. No target defaults to production:

    E2E_SERVE=1 BASE_URL=http://127.0.0.1:8080 EXPECTED_REVISION=$(git rev-parse HEAD) npm run journey

For an explicit read-only production check, use `BASE_URL=https://waseemilyas.uk`
and the exact expected deployed SHA. A stale or different revision fails before
the visitor journey starts.

Set E2E_CHROMIUM to reuse an installed Chromium; E2E_OUT for results/screenshots.
The JSON report and PNG attachments live in E2E_OUT (default `test-results/`).
Inspect the PNGs for clipping and legibility. There is no pixel comparison or
file-size assertion; a passing DOM check does not establish visual correctness.

This package is not called by `.github/workflows/ci.yml`; a green root CI check
does not cover this journey. Read that workflow and the repository's Actions
runner registrations before adding it to CI. Runner availability and budget must
be checked live rather than inferred from an old run or a calendar date.
