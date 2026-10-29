import { test as base, expect } from "@playwright/test";

// Requests outside the selected origin and all writes are aborted before
// transmission. Fetch without redirects so a response cannot escape the guard.
const test = base.extend({
  page: async ({ page, context, baseURL }, use, info) => {
    const blocked = [];
    const errors = [];
    await context.route("**/*", async (route) => {
      const request = route.request();
      if (!["GET", "HEAD"].includes(request.method()) || new URL(request.url()).origin !== baseURL) {
        blocked.push({ method: request.method(), url: request.url() });
        await route.abort("blockedbyclient");
      } else {
        const response = await route.fetch({ maxRedirects: 0 });
        if (response.status() >= 300 && response.status() < 400) {
          blocked.push({ method: request.method(), url: request.url(), reason: "redirect" });
          await route.abort("blockedbyclient");
        } else {
          await route.fulfill({ response });
        }
      }
    });
    await context.routeWebSocket("**/*", (socket) => socket.close());
    context.on("page", (opened) => opened.on("pageerror", (error) => errors.push(String(error))));
    page.on("pageerror", (error) => errors.push(String(error)));
    const revision = await page.goto("/revision.txt");
    expect(revision?.status(), "revision endpoint").toBe(200);
    expect((await revision.text()).trim(), "target build revision").toBe(process.env.EXPECTED_REVISION);
    await use(page);
    await info.attach("blocked-requests", { body: JSON.stringify(blocked, null, 2), contentType: "application/json" });
    expect(errors, "uncaught page errors").toEqual([]);
  },
});

const PAGES = [
  ["/", /Waseem Ilyas/],
  ["/about/", /Waseem Ilyas/],
  ["/work/", /Waseem Ilyas/],
  ["/automancer/", /Automancer|Waseem Ilyas/],
  ["/lab/", /Waseem Ilyas/],
  ["/notes/", /Waseem Ilyas/],
  ["/contact/", /Waseem Ilyas/],
];

test("visitor reads every main page at the expected revision", async ({ page }, info) => {
  for (const [path, title] of PAGES) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
    await expect(page, path).toHaveTitle(title);
    await expect(page.locator("main#main, main").first(), path).toBeVisible();
    await expect(page.locator("h1").first(), path).toBeVisible();
    await expect(page.locator('meta[name="waseemilyas-revision"]'), path).toHaveAttribute("content", process.env.EXPECTED_REVISION);
    // No horizontal overflow at this viewport.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, path + " overflow").toBeLessThanOrEqual(1);
    // Retain pixels for visual inspection. File size cannot prove legibility.
    await info.attach(path === "/" ? "home" : path.replaceAll("/", ""), {
      body: await page.screenshot({ fullPage: true }), contentType: "image/png",
    });
  }
});

test("primary navigation reaches Work and the phone drawer restores focus", async ({ page }, info) => {
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Toggle navigation" });
  const nav = page.getByRole("navigation", { name: "Primary", exact: true });
  if (info.project.name === "phone") {
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("#primary-nav")).toHaveAttribute("inert", "");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(nav.getByRole("link", { name: "Work", exact: true })).toBeVisible();
    await info.attach("open-drawer", { body: await page.screenshot(), contentType: "image/png" });
    await page.keyboard.press("Escape");
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("#primary-nav")).toHaveAttribute("inert", "");
    await toggle.click();
  }
  await nav.getByRole("link", { name: "Work", exact: true }).click();
  await expect(page).toHaveURL(/\/work\/$/);
  await expect(page.locator("h1").first()).toBeVisible();
  if (info.project.name === "phone") await expect(toggle).toHaveAttribute("aria-expanded", "false");
});

test("capabilities respond to pointer and keyboard selection", async ({ page }, info) => {
  await page.goto("/");
  const nodes = page.locator('.node:visible');
  const heading = page.locator("#capread h3");
  const firstTitle = await heading.textContent();
  const pointer = nodes.nth(1);
  const pointerTitle = await pointer.getAttribute("data-title");
  expect(pointerTitle).not.toBe(firstTitle);
  await pointer.click();
  await expect(heading).toHaveText(pointerTitle);
  const keyboard = nodes.nth(2);
  const keyboardTitle = await keyboard.getAttribute("data-title");
  expect(keyboardTitle).not.toBe(pointerTitle);
  await keyboard.focus();
  // Keep keyboard focus while pointer hover selects a different capability;
  // Enter must change the panel itself rather than passing on focus alone.
  await page.mouse.move(0, 0);
  await pointer.hover();
  await expect(heading).toHaveText(pointerTitle);
  await keyboard.press("Enter");
  await expect(heading).toHaveText(keyboardTitle);
  await expect(page.locator("#capread [data-bind=p]")).toHaveText(await keyboard.getAttribute("data-body"));
  await info.attach("selected-capability", { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
});
