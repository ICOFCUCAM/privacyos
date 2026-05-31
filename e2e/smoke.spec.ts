import { test, expect } from "@playwright/test";

/**
 * Smoke E2E over the demo experience (no auth/Supabase required): the landing
 * page, the Command Center, and one page from each product suite render.
 */

test("landing page renders the hero and CTA", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /protect your entire/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /get protected/i }).first()).toBeVisible();
});

test("Command Center loads in demo mode", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Command Center" })).toBeVisible();
  await expect(page.getByText(/Exposure score/i).first()).toBeVisible();
  await expect(page.getByText(/Operations stream/i)).toBeVisible();
});

test("product suites are navigable", async ({ page }) => {
  await page.goto("/dashboard/reputation");
  await expect(page.getByRole("heading", { name: "ReputationOS" })).toBeVisible();

  await page.goto("/dashboard/removals");
  await expect(page.getByRole("heading", { name: /Data Broker Removals/i })).toBeVisible();

  await page.goto("/dashboard/audit");
  await expect(page.getByRole("heading", { name: /Audit Log/i })).toBeVisible();
});

test("operator consoles render", async ({ page }) => {
  await page.goto("/dashboard/business-intelligence");
  await expect(page.getByRole("heading", { name: /Growth & Revenue/i })).toBeVisible();

  await page.goto("/dashboard/playbooks");
  await expect(page.getByRole("heading", { name: /Response Playbooks/i })).toBeVisible();

  await page.goto("/dashboard/compliance");
  await expect(page.getByRole("heading", { name: /Compliance & SLAs/i })).toBeVisible();
});

test("AI assistant can run a protection cycle", async ({ page }) => {
  await page.goto("/dashboard/assistant");
  await page.getByRole("button", { name: /protect me/i }).click();
  await expect(page.getByText(/Action plan/i)).toBeVisible({ timeout: 15_000 });
});
