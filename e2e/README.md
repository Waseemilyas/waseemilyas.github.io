# Visitor journey (read-only)

GET-only Playwright journey: walks every nav page at desktop and phone widths,
asserts status, title, h1, no horizontal overflow, no uncaught page errors,
captures a full-page screenshot (must be a real image), clicks through to Work,
and reads /revision.txt. No forms, mail links, external links or writes.

Isolated from the site package (root lockfile untouched):

    cd e2e && npm i && npx playwright install chromium
    npx playwright test -c playwright.config.mjs
    BASE_URL=http://localhost:8080 npx playwright test -c playwright.config.mjs   # local _site

Set E2E_CHROMIUM to reuse an installed Chromium; E2E_OUT for results/screenshots.
Not wired into ci.yml: GitHub Actions budget is out until 1 Nov; add a self-hosted job then.
