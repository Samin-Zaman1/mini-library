import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
    projects: [
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: "playwright/.auth/member.json" },
      dependencies: ["setup"],
      testIgnore: /.*\.setup\.ts/,
    },
  ],
  webServer: {
    command: "npx http-server src/public -p 3000 -s",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});