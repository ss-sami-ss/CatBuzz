import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test("مسیر حساب از صفحهٔ اصلی برای کاربر مهمان در دسترس است", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "حساب کاربری" }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("status")).toHaveText("برای دسترسی به حساب وارد شوید.");
  await expect(page.getByLabel("ایمیل")).toBeVisible();
  await expect(page.getByRole("button", { name: "دریافت کد", exact: true })).toBeEnabled();
});
test("حساب جدید با کد ایمیل فعال می‌شود و تغییرات حساب باقی می‌ماند", async ({ page, request }) => {
  test.skip(!process.env.CATBUZZ_TEST_MAILPIT, "Requires the local CatBuzz database, Redis and Mailpit.");
  const mailpit = process.env.CATBUZZ_TEST_MAILPIT;
  const suffix = randomUUID().replaceAll("-", "").slice(0, 16);
  const email = `account-${suffix}@example.test`;

  await page.goto("/");
  await page.getByRole("link", { name: "حساب کاربری" }).click();
  await expect(page.getByRole("status")).toHaveText("برای دسترسی به حساب وارد شوید.");
  await page.getByLabel("ایمیل").fill(email);
  await page.getByLabel("نوع درخواست").selectOption("sign_up");
  await page.getByRole("button", { name: "دریافت کد", exact: true }).click();
  await expect(page.getByRole("heading", { name: "تأیید ایمیل" })).toBeVisible();

  let code: string | undefined;
  await expect.poll(async () => {
    const response = await request.get(`${mailpit}/api/v1/search`, { params: { query: `to:${email}` } });
    if (!response.ok()) return undefined;
    const result = await response.json() as { messages: { Subject: string }[] | null };
    code = result.messages?.[0]?.Subject.match(/\b\d{6}\b/)?.[0];
    return code;
  }).toBeTruthy();

  await page.getByLabel("کد شش‌رقمی").fill(code!);
  await page.getByRole("button", { name: "تأیید کد", exact: true }).click();
  await page.getByRole("textbox", { name: /^نام\s*\*?$/ }).fill("نام آزمایشی");
  await page.getByLabel("نام خانوادگی").fill("حساب آزمایشی");
  await page.getByLabel("نام کاربری عمومی").fill(`test_${suffix}`);
  await page.getByRole("button", { name: "ذخیرهٔ مشخصات" }).click();
  await expect(page.getByRole("status")).toHaveText("مشخصات ذخیره شد.");

  const feeding = page.getByRole("checkbox", { name: "غذارسانی" });
  await feeding.focus();
  await feeding.press("Space");
  await page.getByRole("checkbox", { name: "جابه‌جایی" }).check();
  await page.getByRole("button", { name: "ذخیرهٔ توانمندی‌ها" }).click();
  await expect(page.getByRole("status")).toHaveText("توانمندی‌ها ذخیره شد.");

  await page.reload();
  await expect(page.getByLabel("نام کاربری عمومی")).toHaveValue(`test_${suffix}`);
  await expect(feeding).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "جابه‌جایی" })).toBeChecked();

  await page.getByRole("button", { name: "خروج از حساب" }).click();
  await expect(page.getByRole("heading", { name: "ورود و ثبت‌نام" })).toBeVisible();
  expect((await page.request.get("/api/v1/me")).status()).toBe(401);
});
