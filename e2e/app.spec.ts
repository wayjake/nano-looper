import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("loads with correct title and create button", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle("Nano Looper");
    await expect(page.getByRole("heading", { name: "Nano Looper" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Create New Room" })).toBeVisible();
  });

  test("creating a room redirects to room page", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Create New Room" }).click();

    // Should redirect to /r/:roomId (UUID format)
    await expect(page).toHaveURL(/\/r\/[a-f0-9-]+/, { timeout: 10000 });
  });
});

test.describe("Room Page", () => {
  test("displays room header with ID and tempo", async ({ page }) => {
    // Create a room first via the homepage
    await page.goto("/");
    await page.getByRole("button", { name: "Create New Room" }).click();
    await expect(page).toHaveURL(/\/r\/[a-f0-9-]+/);

    // Check header elements
    await expect(page.getByRole("heading", { name: "Nano Looper" })).toBeVisible();
    await expect(page.getByText(/Room:/)).toBeVisible();
    await expect(page.getByText("120 BPM")).toBeVisible();
  });

  test("displays DAW view on desktop", async ({ page }) => {
    // Create a room first
    await page.goto("/");
    await page.getByRole("button", { name: "Create New Room" }).click();
    await expect(page).toHaveURL(/\/r\/[a-f0-9-]+/);

    // Desktop viewport (default in Playwright)
    await expect(page.getByText("DAW View")).toBeVisible();

    // Check transport controls
    await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Stop" })).toBeVisible();

    // Check tempo input
    await expect(page.getByRole("spinbutton")).toHaveValue("120");

    // Check 16-pad grid exists (these are divs in DAW view)
    const pads = page.locator(".grid.grid-cols-4 > div");
    await expect(pads).toHaveCount(16);
  });

  test("displays Controller view on mobile", async ({ page }) => {
    // Set mobile viewport before navigation
    await page.setViewportSize({ width: 375, height: 667 });

    // Create a room first
    await page.goto("/");
    await page.getByRole("button", { name: "Create New Room" }).click();
    await expect(page).toHaveURL(/\/r\/[a-f0-9-]+/);

    // Should show Controller view instead of DAW view
    await expect(page.getByText("Controller")).toBeVisible();
    await expect(page.getByText("DAW View")).not.toBeVisible();

    // Check 16-pad grid exists as buttons in Controller view
    const padButtons = page.locator(".grid.grid-cols-4 > button");
    await expect(padButtons).toHaveCount(16);
  });

  test("can revisit a created room", async ({ page }) => {
    // Create a room
    await page.goto("/");
    await page.getByRole("button", { name: "Create New Room" }).click();
    await expect(page).toHaveURL(/\/r\/[a-f0-9-]+/);

    // Capture the room URL
    const roomUrl = page.url();

    // Navigate away
    await page.goto("/");
    await expect(page).toHaveURL("/");

    // Navigate back to the room
    await page.goto(roomUrl);
    await expect(page.getByText("DAW View")).toBeVisible();
    await expect(page.getByText("120 BPM")).toBeVisible();
  });
});

test.describe("Room Error Handling", () => {
  test("returns 400 for invalid room ID format", async ({ page }) => {
    const response = await page.goto("/r/not-a-valid-uuid");

    expect(response?.status()).toBe(400);
  });

  test("returns 404 for non-existent room", async ({ page }) => {
    // Valid UUID format but doesn't exist in DB
    const response = await page.goto("/r/01234567-89ab-cdef-0123-456789abcdef");

    expect(response?.status()).toBe(404);
  });
});

test.describe("Save Room API", () => {
  test("can save a room to prevent expiry", async ({ page, request }) => {
    // Create a room first
    await page.goto("/");
    await page.getByRole("button", { name: "Create New Room" }).click();
    await expect(page).toHaveURL(/\/r\/[a-f0-9-]+/);

    // Extract room ID from URL
    const url = page.url();
    const roomId = url.split("/r/")[1];

    // Call save API
    const response = await request.post(`/api/rooms/${roomId}/save`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.roomId).toBe(roomId);
    expect(data.saved).toBe(true);
    expect(data.savedAt).toBeDefined();
  });

  test("saving already saved room returns success", async ({ page, request }) => {
    // Create a room
    await page.goto("/");
    await page.getByRole("button", { name: "Create New Room" }).click();
    await expect(page).toHaveURL(/\/r\/[a-f0-9-]+/);

    const url = page.url();
    const roomId = url.split("/r/")[1];

    // Save it once
    await request.post(`/api/rooms/${roomId}/save`);

    // Save it again
    const response = await request.post(`/api/rooms/${roomId}/save`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.saved).toBe(true);
    expect(data.message).toBe("Room is already saved");
  });

  test("returns 404 for saving non-existent room", async ({ request }) => {
    const response = await request.post(
      "/api/rooms/01234567-89ab-cdef-0123-456789abcdef/save"
    );

    expect(response.status()).toBe(404);

    const data = await response.json();
    expect(data.error).toBe("Room not found or expired");
  });

  test("returns 400 for invalid room ID", async ({ request }) => {
    const response = await request.post("/api/rooms/invalid-id/save");

    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.error).toBe("Invalid room ID");
  });
});
