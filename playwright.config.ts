import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const externalBaseUrl = process.env.CATBUZZ_TEST_BASE_URL;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: externalBaseUrl ?? `http://localhost:${PORT}`,
    locale: "fa-IR",
    // Stable e2e runs use reduced motion (docs/18 §آزمون); a full-motion pass lives in its own project.
    reducedMotion: "reduce",
  },
  projects: [
    { name: "mobile-360", use: { ...devices["Pixel 5"], viewport: { width: 360, height: 740 } } },
    { name: "desktop-1440", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    {
      name: "mobile-full-motion",
      use: { ...devices["Pixel 5"], viewport: { width: 360, height: 740 }, reducedMotion: "no-preference" },
    },
  ],
  webServer: externalBaseUrl ? undefined : {
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/sample`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
