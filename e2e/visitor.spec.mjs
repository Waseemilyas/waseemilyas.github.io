import { test, expect } from "@playwright/test";

// GET-only: navigates, reads, screenshots. No forms, no mailto/external clicks.
const PAGES = [
  ["/", /Waseem Ilyas/],
  ["/about/", /Waseem Ilyas/],
  ["/work/", /Waseem Ilyas/],
  ["/automancer/", /Automancer|Waseem Ilyas/],
  ["/lab/", /Waseem Ilyas/],
  ["/notes/", /Waseem Ilyas/],
  ["/contact/", /Waseem Ilyas/],
];

test("visitor walks every page and screenshots render", async ({ page }, info) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  for (const [path, title] of PAGES) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
    await expect(page, path).toHaveTitle(title);
    await expect(page.locator("main#main, main").first(), path).toBeVisible();
    await expect(page.locator("h1").first(), path).toBeVisible();
    // No horizontal overflow at this viewport.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, path + " overflow").toBeLessThanOrEqual(1);
    // Screenshot check: capture, then require a real, non-blank image.
    const shot = await page.screenshot({ fullPage: true });
    info.attach("shot" + (path.replaceAll("/", "_") || "_home"), { body: shot, contentType: "image/png" });
    expect(shot.length, path + " screenshot size").toBeGreaterThan(8_000);
  }
  expect(errors, "uncaught page errors").toEqual([]);
});

test("navigation reaches Work by clicking", async ({ page }) => {
  await page.goto("/");
  const nav = page.locator("a[href=\"/work/\"]:visible").first();
  if (await nav.count()) {
    await nav.click();
  } else {
    // Phone: open the drawer first.
    await page.locator("button[aria-controls], button[aria-expanded]").first().click();
    await page.locator("a[href=\"/work/\"]:visible").first().click();
  }
  await expect(page).toHaveURL(/\/work\/$/);
  await expect(page.locator("h1").first()).toBeVisible();
});

test("revision.txt is served", async ({ request }) => {
  const r = await request.get("/revision.txt");
  expect(r.status()).toBe(200);
  expect((await r.text()).trim()).toMatch(/^[0-9a-f]{7,40}$/);
});
