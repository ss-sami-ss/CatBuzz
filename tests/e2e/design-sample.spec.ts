import { expect, test } from "@playwright/test";

const SHOTS = process.env.CATBUZZ_SCREENSHOT_DIR;

test.describe("design sample (/sample)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/sample");
  });

  test("is RTL, labels sample data and has no horizontal scroll", async ({ page }, info) => {
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("note")).toContainText("ساختگی");
    await expect(page.getByRole("article")).toHaveCount(7);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${info.project.name}-list.png`, fullPage: true });
  });

  test("opens details, closes with Escape and returns focus", async ({ page }, info) => {
    const trigger = page.getByRole("button", { name: "مشاهدهٔ خلاصه" }).first();
    await trigger.click();
    const surface = page.getByRole("dialog");
    await expect(surface).toBeVisible();
    await expect(surface.getByRole("heading", { name: "نارنج نمونه" })).toBeVisible();
    await expect(surface.getByRole("button", { name: "کمک می‌کنم" })).toBeDisabled();
    await page.waitForTimeout(600); // let the entrance settle before the screenshot
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${info.project.name}-details.png` });

    await page.keyboard.press("Escape");
    await expect(surface).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("simulated reload shows busy state then fresh cards", async ({ page }) => {
    const list = page.getByRole("region", { name: "فهرست گربه‌ها" });
    await page.getByRole("button", { name: "شبیه‌سازی بارگذاری" }).click();
    await expect(list).toHaveAttribute("aria-busy", "true");
    await expect(list).toHaveAttribute("aria-busy", "false", { timeout: 5_000 });
    await expect(page.getByRole("article")).toHaveCount(7);
    await expect(page.getByText("فهرست به‌روز شد.")).toBeAttached();
  });
});
