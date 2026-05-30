import { test, expect } from "@playwright/test";

/**
 * Smoke E2E over the demo experience (no auth/Supabase required): the landing
 * page, the dashboard overview, and one page from each product suite render.
 */

test("landing page renders the hero and CTA", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /personal information/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /protect me/i })).toBeVisible();
});

test("dashboard overview loads in demo mode", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await expect(page.getByText(/Demo data/i)).toBeVisible();
  await expect(page.getByText(/Risk score trend/i)).toBeVisible();
});

test("product suites are navigable", async ({ page }) => {
  await page.goto("/dashboard/reputation");
  await expect(page.getByRole("heading", { name: "ReputationOS" })).toBeVisible();

  await page.goto("/dashboard/removals");
  await expect(page.getByRole("heading", { name: /Data Broker Removals/i })).toBeVisible();

  await page.goto("/dashboard/audit");
  await expect(page.getByRole("heading", { name: /Audit Log/i })).toBeVisible();
});

test("AI assistant can run a protection cycle", async ({ page }) => {
  await page.goto("/dashboard/assistant");
  await page.getByRole("button", { name: /protect me/i }).click();
  await expect(page.getByText(/Action plan/i)).toBeVisible({ timeout: 15_000 });
});
