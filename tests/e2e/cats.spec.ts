import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import sharp from "sharp";

test.use({ launchOptions: { args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] } });

test("guest sees the sign-in gate for cat registration", async ({ page }) => {
  await page.goto("/cats/new");
  await expect(page.getByRole("link", { name: "وارد حساب کاربری شوید" })).toHaveAttribute("href", "/account");
  await expect(page.getByRole("button", { name: "ثبت پرونده" })).toHaveCount(0);
});

test("registers an unknown cat with two photos and serves only published derivatives", async ({ page, request, browser, baseURL }) => {
  const mailpit = process.env.CATBUZZ_TEST_MAILPIT;
  test.skip(!mailpit || !baseURL, "Requires the local CatBuzz stack.");
  const origin = new URL(baseURL!).origin;
  const name = "نمونه " + randomUUID().slice(0, 8);
  const email = randomUUID() + "@example.test";
  const started = await page.request.post("/api/v1/auth/challenges", { data: { contact: { kind: "email", value: email }, purpose: "sign_up" } });
  expect(started.status()).toBe(201);
  const { data: challenge } = await started.json();
  let code: string | undefined;
  await expect.poll(async () => {
    const response = await request.get(mailpit + "/api/v1/search", { params: { query: "to:" + email } });
    if (!response.ok()) return;
    const body = await response.json() as { messages?: { Subject: string }[] };
    code = body.messages?.[0]?.Subject.match(/\b\d{6}\b/)?.[0];
    return code;
  }).toBeTruthy();
  expect((await page.request.post("/api/v1/auth/verify", { data: { challengeId: challenge.challengeId, code } })).status()).toBe(200);

  const photo = await sharp({ create: { width: 32, height: 24, channels: 3, background: "orange" } }).jpeg().toBuffer();
  await page.goto("/cats/new");
  await page.getByLabel("نام گربه").fill(name);
  await page.getByRole("button", { name: "انتخاب روی نقشه" }).click();
  await expect(page.getByLabel("نقشهٔ انتخاب محل مشاهده")).toHaveAttribute("aria-busy", "false");
  await page.locator(".maplibregl-canvas").click();
  const lng = page.getByRole("textbox", { name: "طول جغرافیایی" });
  await expect(lng).not.toHaveValue("");
  await lng.fill("51.401234");
  await page.getByRole("textbox", { name: "عرض جغرافیایی" }).fill("35.721234");
  const photos = page.getByLabel("عکس‌ها", { exact: true });
  await photos.setInputFiles({ name: "bad.txt", mimeType: "text/plain", buffer: Buffer.from("invalid") });
  await page.getByRole("button", { name: "ثبت پرونده", exact: true }).click();
  await expect(page.getByText(/هر عکس باید/)).toBeVisible();
  await photos.setInputFiles(["first.jpg", "second.jpg"].map((file) => ({ name: file, mimeType: "image/jpeg", buffer: photo })));
  await page.getByRole("checkbox", { name: /در پروندهٔ عمومی نمایش داده شوند/ }).check();
  await page.getByRole("button", { name: "ثبت پرونده", exact: true }).click();
  await expect(page).toHaveURL(/\/cats\/[a-f0-9-]+$/);
  const id = page.url().split("/").at(-1)!;

  const guest = await browser.newContext();
  try {
    const detail = await guest.newPage();
    await detail.goto(origin + "/cats/" + id);
    await expect(detail.getByRole("heading", { name })).toBeVisible();
    await expect(detail.getByRole("img", { name: "عکس " + name })).toHaveCount(2);
    const src = await detail.getByRole("img", { name: "عکس " + name }).first().getAttribute("src");
    const publicImage = await guest.request.get(origin + src);
    expect(publicImage.status()).toBe(200);
    expect(publicImage.headers()["content-type"]).toContain("image/jpeg");
    expect((await detail.content()).includes("51.401234")).toBe(false);
    await detail.goto(origin + "/cats");
    await expect(detail.getByRole("link", { name: new RegExp(name) })).toBeVisible();
    await detail.getByRole("link", { name: "فوری", exact: true }).click();
    await expect(detail).toHaveURL(/need=urgent/);
    await expect(detail.getByRole("link", { name: new RegExp(name) })).toHaveCount(0);

    const archived = await page.request.delete("/api/v1/cats/" + id, { headers: { origin }, data: { version: 0 } });
    expect(archived.status()).toBe(204);
    expect((await guest.request.get(origin + src)).status()).toBe(404);
  } finally {
    await guest.close();
  }
});
