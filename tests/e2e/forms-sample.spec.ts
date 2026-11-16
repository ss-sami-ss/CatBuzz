import { expect, test } from "@playwright/test";

const SHOTS = process.env.CATBUZZ_SCREENSHOT_DIR;

test.describe("form controls sample (/sample/forms)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/sample/forms");
  });

  test("labels sample data, keeps LTR for phone and has no horizontal scroll", async ({ page }, info) => {
    await expect(page.getByRole("note")).toContainText("هیچ درخواستی ثبت نمی‌شود");
    await expect(page.getByRole("textbox", { name: "شمارهٔ تماس" })).toHaveAttribute("dir", "ltr");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${info.project.name}-forms.png`, fullPage: true });
  });

  test("empty submit shows linked errors and sends nothing", async ({ page }, info) => {
    await page.getByRole("button", { name: "ارسال درخواست" }).click();
    const name = page.getByRole("textbox", { name: "نام گربه" });
    await expect(name).toHaveAttribute("aria-invalid", "true");
    await expect(name).toBeFocused();
    await expect(page.getByText("این فیلد را پر کنید.")).toBeVisible();
    await expect(page.getByText("یک گزینه را انتخاب کنید.")).toBeVisible();
    await expect(page.getByText("برای ادامه این گزینه را تأیید کنید.")).toBeVisible();
    await expect(page.locator("[data-sonner-toast]")).toHaveCount(0);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${info.project.name}-forms-errors.png`, fullPage: true });
  });

  test("filled form only shows the honest sample toast", async ({ page }, info) => {
    await page.getByRole("textbox", { name: "نام گربه" }).fill("نارنج");
    await page.getByRole("combobox", { name: "نوع نگهداری" }).click();
    await page.getByRole("option", { name: "خانهٔ موقت برای گربهٔ خیابانی" }).click();
    await expect(page.getByRole("combobox", { name: "نوع نگهداری" })).toContainText("خانهٔ موقت");
    await page.getByRole("checkbox").click();
    await page.getByRole("button", { name: "ارسال درخواست" }).click();
    await expect(page.getByText("این فرم نمونه است؛ درخواستی ثبت یا ارسال نشد.")).toBeVisible();
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${info.project.name}-forms-toast.png` });
  });

  test("select works from the keyboard", async ({ page }) => {
    const trigger = page.getByRole("combobox", { name: "نوع نگهداری" });
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("listbox")).toBeVisible();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("listbox")).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(trigger).not.toContainText("انتخاب کنید");
  });

  test("tabs follow RTL arrow keys", async ({ page }, info) => {
    const first = page.getByRole("tab", { name: "فرم درخواست" });
    await first.focus();
    // In RTL the next tab sits to the left.
    await page.keyboard.press("ArrowLeft");
    const states = page.getByRole("tab", { name: "حالت‌ها" });
    await expect(states).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(states).toHaveAttribute("aria-selected", "true");
    // The clipped indicator bar must sit under the active tab (RTL-safe measurement).
    await expect
      .poll(() =>
        page.evaluate(() => {
          const tab = document.querySelector('[role="tab"][aria-selected="true"]')!.getBoundingClientRect();
          const bar = document.querySelector('[role="tablist"] > span:last-child, [role="tablist"] > div:last-child')!;
          const style = getComputedStyle(bar);
          const list = bar.parentElement!.getBoundingClientRect();
          const left = list.left + parseFloat(style.getPropertyValue("--active-tab-left"));
          return Math.abs(left - tab.left) < 2;
        }),
      )
      .toBe(true);
    await expect(page.getByRole("textbox", { name: "نام کاربری" })).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText("این نام کاربری قبلاً گرفته شده است.", { exact: false })).toBeVisible();

    await page.getByRole("button", { name: "نمایش toast خطا" }).click();
    await expect(page.locator('[data-sonner-toast][data-type="error"]')).toBeVisible();
    await page.waitForTimeout(500); // let the toast settle before the screenshot
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${info.project.name}-forms-states.png`, fullPage: true });
  });
});
