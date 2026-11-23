import { expect, test } from "@playwright/test";

test.use({ launchOptions: { args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] } });

test("home filters fixtures and offers an accessible list", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("این صفحه با داده و موقعیت‌های آزمایشی نمایش داده می‌شود.")).toBeVisible();
  await page.getByRole("button", { name: "فقط فهرست", exact: true }).click();
  await expect(page.getByRole("region", { name: "نقشهٔ گربه‌ها" })).toHaveCount(0);

  const results = page.getByRole("region", { name: "گربه‌های نمونه" });
  await expect(results.getByRole("button")).toHaveCount(3);
  await page.getByRole("button", { name: "فوری", exact: true }).click();
  await expect(results.getByRole("button")).toHaveCount(1);
  await expect(results.getByRole("button", { name: /برفی/ })).toBeVisible();

  const search = page.getByRole("searchbox");
  await search.fill("فاطمی");
  await expect(results.getByText(/موردی پیدا نشد/)).toBeVisible();
  await page.getByRole("button", { name: "همه", exact: true }).click();
  await expect(results.getByRole("button", { name: /فندق/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
});

test("map and list share selection and use the visible bounds", async ({ page }) => {
  await page.goto("/");
  const map = page.getByRole("region", { name: "نقشهٔ گربه‌ها" });
  const results = page.getByRole("region", { name: "گربه‌های نمونه" });
  const marker = map.getByRole("button", { name: "برفی، فوری", exact: true });
  await expect(marker).toBeVisible({ timeout: 18000 });

  await marker.click();
  await expect(results.getByRole("button", { name: /برفی/ })).toHaveAttribute("aria-pressed", "true");
  await results.getByRole("button", { name: /نارنج/ }).click();
  await expect(map.getByRole("button", { name: "نارنج", exact: true })).toHaveAttribute("aria-pressed", "true");

  await map.getByRole("button", { name: "کوچک‌نمایی", exact: true }).click();
  await map.getByRole("button", { name: "جست‌وجو در این محدوده" }).click();
  await expect(page.getByRole("button", { name: "پاک کردن محدوده" })).toBeVisible();
  await expect(results.getByRole("button")).toHaveCount(3);
});

test("the list stays usable when WebGL is unavailable", async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      value(this: HTMLCanvasElement, type: string, options?: unknown) {
        return type.startsWith("webgl") || type === "experimental-webgl"
          ? null
          : Reflect.apply(getContext, this, [type, options]);
      },
    });
  });
  await page.goto("/");
  await expect(page.getByRole("region", { name: "نقشهٔ گربه‌ها" }).getByRole("alert")).toHaveText("نقشه در دسترس نیست. گربه‌ها را در فهرست ببینید.", { timeout: 18000 });
  await expect(page.getByRole("region", { name: "گربه‌های نمونه" }).getByRole("button")).toHaveCount(3);
});
