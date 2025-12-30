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
    await expect(page).toHaveURL(/\/r\/[a-f0-9-]+/, { timeout: 10000 });

    // Check header elements
    await expect(page.getByRole("heading", { name: "Nano Looper" })).toBeVisible();
    await expect(page.getByText(/Room:/)).toBeVisible();
    await expect(page.getByText("120 BPM")).toBeVisible();
  });

  test("displays DAW view on desktop", async ({ page }) => {
    // Create a room first
    await page.goto("/");
    await page.getByRole("button", { name: "Create New Room" }).click();
    await expect(page).toHaveURL(/\/r\/[a-f0-9-]+/, { timeout: 10000 });

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
    await expect(page).toHaveURL(/\/r\/[a-f0-9-]+/, { timeout: 10000 });

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
    await expect(page).toHaveURL(/\/r\/[a-f0-9-]+/, { timeout: 10000 });

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
    await expect(page).toHaveURL(/\/r\/[a-f0-9-]+/, { timeout: 10000 });

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
    await expect(page).toHaveURL(/\/r\/[a-f0-9-]+/, { timeout: 10000 });

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

test.describe("Sounds List API", () => {
  test("returns empty sounds array for new room", async ({ page, request }) => {
    // Create a room
    await page.goto("/");
    await page.getByRole("button", { name: "Create New Room" }).click();
    await expect(page).toHaveURL(/\/r\/[a-f0-9-]+/, { timeout: 10000 });

    const roomId = page.url().split("/r/")[1];

    const response = await request.get(`/api/rooms/${roomId}/sounds`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.sounds).toEqual([]);
  });

  test("returns 404 for non-existent room", async ({ request }) => {
    const response = await request.get(
      "/api/rooms/01234567-89ab-cdef-0123-456789abcdef/sounds"
    );

    expect(response.status()).toBe(404);

    const data = await response.json();
    expect(data.error).toBe("Room not found or expired");
  });

  test("returns 400 for invalid room ID", async ({ request }) => {
    const response = await request.get("/api/rooms/invalid-id/sounds");

    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.error).toBe("Invalid room ID");
  });
});

test.describe("Pad Assignment API", () => {
  test("can assign sound to pad", async ({ page, request }) => {
    // Create a room
    await page.goto("/");
    await page.getByRole("button", { name: "Create New Room" }).click();
    await expect(page).toHaveURL(/\/r\/[a-f0-9-]+/, { timeout: 10000 });

    const roomId = page.url().split("/r/")[1];
    const fakeSoundId = "01234567-89ab-cdef-0123-456789abcdef";

    // Assign a sound to pad 0
    const response = await request.put(`/api/rooms/${roomId}/pads/0`, {
      data: { soundId: fakeSoundId },
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.padMappings["0"]).toBe(fakeSoundId);
  });

  test("can clear pad assignment", async ({ page, request }) => {
    // Create a room
    await page.goto("/");
    await page.getByRole("button", { name: "Create New Room" }).click();
    await expect(page).toHaveURL(/\/r\/[a-f0-9-]+/, { timeout: 10000 });

    const roomId = page.url().split("/r/")[1];
    const fakeSoundId = "01234567-89ab-cdef-0123-456789abcdef";

    // First assign a sound
    await request.put(`/api/rooms/${roomId}/pads/0`, {
      data: { soundId: fakeSoundId },
    });

    // Then clear it
    const response = await request.put(`/api/rooms/${roomId}/pads/0`, {
      data: { soundId: null },
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.padMappings["0"]).toBeUndefined();
  });

  test("pad assignments persist across requests", async ({ page, request }) => {
    // Create a room
    await page.goto("/");
    await page.getByRole("button", { name: "Create New Room" }).click();
    await expect(page).toHaveURL(/\/r\/[a-f0-9-]+/, { timeout: 10000 });

    const roomId = page.url().split("/r/")[1];
    const sound1 = "11111111-1111-1111-1111-111111111111";
    const sound2 = "22222222-2222-2222-2222-222222222222";

    // Assign sounds to multiple pads
    await request.put(`/api/rooms/${roomId}/pads/0`, { data: { soundId: sound1 } });
    await request.put(`/api/rooms/${roomId}/pads/5`, { data: { soundId: sound2 } });
    const response = await request.put(`/api/rooms/${roomId}/pads/15`, {
      data: { soundId: sound1 },
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.padMappings["0"]).toBe(sound1);
    expect(data.padMappings["5"]).toBe(sound2);
    expect(data.padMappings["15"]).toBe(sound1);
  });

  test("returns 400 for invalid pad index", async ({ page, request }) => {
    // Create a room
    await page.goto("/");
    await page.getByRole("button", { name: "Create New Room" }).click();
    await expect(page).toHaveURL(/\/r\/[a-f0-9-]+/, { timeout: 10000 });

    const roomId = page.url().split("/r/")[1];

    // Pad index 16 is out of range (0-15)
    const response = await request.put(`/api/rooms/${roomId}/pads/16`, {
      data: { soundId: "01234567-89ab-cdef-0123-456789abcdef" },
    });

    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.error).toBe("Invalid pad index (must be 0-15)");
  });

  test("returns 400 for invalid sound ID", async ({ page, request }) => {
    // Create a room
    await page.goto("/");
    await page.getByRole("button", { name: "Create New Room" }).click();
    await expect(page).toHaveURL(/\/r\/[a-f0-9-]+/, { timeout: 10000 });

    const roomId = page.url().split("/r/")[1];

    const response = await request.put(`/api/rooms/${roomId}/pads/0`, {
      data: { soundId: "not-a-uuid" },
    });

    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.error).toBe("Invalid sound ID");
  });

  test("returns 404 for non-existent room", async ({ request }) => {
    const response = await request.put(
      "/api/rooms/01234567-89ab-cdef-0123-456789abcdef/pads/0",
      { data: { soundId: "11111111-1111-1111-1111-111111111111" } }
    );

    expect(response.status()).toBe(404);

    const data = await response.json();
    expect(data.error).toBe("Room not found or expired");
  });
});

test.describe("Sound API", () => {
  test("returns 404 for non-existent sound", async ({ request }) => {
    const response = await request.get(
      "/api/sounds/01234567-89ab-cdef-0123-456789abcdef"
    );

    expect(response.status()).toBe(404);
  });

  test("returns 400 for invalid sound ID on GET", async ({ request }) => {
    const response = await request.get("/api/sounds/invalid-id");

    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.error).toBe("Invalid sound ID");
  });

  test("returns 404 when deleting non-existent sound", async ({ request }) => {
    const response = await request.delete(
      "/api/sounds/01234567-89ab-cdef-0123-456789abcdef"
    );

    expect(response.status()).toBe(404);

    const data = await response.json();
    expect(data.error).toBe("Sound not found");
  });

  test("returns 400 for invalid sound ID on DELETE", async ({ request }) => {
    const response = await request.delete("/api/sounds/invalid-id");

    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.error).toBe("Invalid sound ID");
  });
});

test.describe("WebSocket Server", () => {
  const WS_PORT = 5174;
  const WS_BASE = `http://localhost:${WS_PORT}`;

  test("health check returns ok", async ({ request }) => {
    const response = await request.get(`${WS_BASE}/health`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.status).toBe("ok");
    expect(data.timestamp).toBeDefined();
  });

  test("root returns server info", async ({ request }) => {
    const response = await request.get(WS_BASE);

    expect(response.status()).toBe(200);

    const text = await response.text();
    expect(text).toContain("WebSocket server");
  });
});

test.describe("Connection Status UI", () => {
  test("displays connection status indicator in room", async ({ page }) => {
    // Create a room
    await page.goto("/");
    await page.getByRole("button", { name: "Create New Room" }).click();
    await expect(page).toHaveURL(/\/r\/[a-f0-9-]+/, { timeout: 10000 });

    // Connection status should be visible in header
    // It will show "Connecting..." initially, then "Connected" or stay connecting if WS server isn't running
    const statusText = page.locator("header").getByText(/Connecting|Connected|Disconnected|Reconnecting/);
    await expect(statusText).toBeVisible({ timeout: 5000 });
  });

  test("displays connection indicator dot", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Create New Room" }).click();
    await expect(page).toHaveURL(/\/r\/[a-f0-9-]+/, { timeout: 10000 });

    // Should have a colored dot indicator (green, yellow, or red)
    const indicator = page.locator("header .rounded-full");
    await expect(indicator).toBeVisible();
  });
});

test.describe("WebSocket Connection", () => {
  test("can establish WebSocket connection", async ({ page }) => {
    // Create a room to get a valid room ID
    await page.goto("/");
    await page.getByRole("button", { name: "Create New Room" }).click();
    await expect(page).toHaveURL(/\/r\/[a-f0-9-]+/, { timeout: 10000 });

    const roomId = page.url().split("/r/")[1];

    // Test WebSocket connection via page evaluation
    const result = await page.evaluate(async (roomId) => {
      return new Promise((resolve) => {
        const ws = new WebSocket("ws://localhost:5174/ws");
        const messages: string[] = [];

        ws.onopen = () => {
          // Send join message
          ws.send(JSON.stringify({ type: "join", roomId, role: "controller" }));
        };

        ws.onmessage = (event) => {
          messages.push(event.data);
          // After receiving a message, close and resolve
          setTimeout(() => {
            ws.close();
            resolve({ connected: true, messages });
          }, 100);
        };

        ws.onerror = () => {
          resolve({ connected: false, error: "connection error" });
        };

        // Timeout after 3 seconds
        setTimeout(() => {
          ws.close();
          resolve({ connected: ws.readyState === WebSocket.OPEN, messages, timeout: true });
        }, 3000);
      });
    }, roomId);

    expect(result).toHaveProperty("connected", true);
  });

  test("receives sync-state after joining room", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Create New Room" }).click();
    await expect(page).toHaveURL(/\/r\/[a-f0-9-]+/, { timeout: 10000 });

    const roomId = page.url().split("/r/")[1];

    const result = await page.evaluate(async (roomId) => {
      return new Promise((resolve) => {
        const ws = new WebSocket("ws://localhost:5174/ws");
        const messages: any[] = [];

        ws.onopen = () => {
          ws.send(JSON.stringify({ type: "join", roomId, role: "daw" }));
        };

        ws.onmessage = (event) => {
          try {
            messages.push(JSON.parse(event.data));
          } catch {
            messages.push(event.data);
          }

          // Check if we got a sync-state message
          if (messages.some((m) => m.type === "sync-state")) {
            ws.close();
            resolve({ success: true, messages });
          }
        };

        ws.onerror = () => {
          resolve({ success: false, error: "connection error" });
        };

        setTimeout(() => {
          ws.close();
          resolve({ success: false, messages, timeout: true });
        }, 3000);
      });
    }, roomId);

    expect(result).toHaveProperty("success", true);
    expect((result as any).messages).toContainEqual(
      expect.objectContaining({ type: "sync-state" })
    );
  });

  test("pad-hit message is broadcast to room", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Create New Room" }).click();
    await expect(page).toHaveURL(/\/r\/[a-f0-9-]+/, { timeout: 10000 });

    const roomId = page.url().split("/r/")[1];

    const result = await page.evaluate(async (roomId) => {
      return new Promise((resolve) => {
        // Connect two clients to the same room
        const ws1 = new WebSocket("ws://localhost:5174/ws");
        const ws2 = new WebSocket("ws://localhost:5174/ws");
        const ws2Messages: any[] = [];
        let ws1Joined = false;
        let ws2Joined = false;

        ws1.onopen = () => {
          ws1.send(JSON.stringify({ type: "join", roomId, role: "controller" }));
        };

        ws2.onopen = () => {
          ws2.send(JSON.stringify({ type: "join", roomId, role: "daw" }));
        };

        ws1.onmessage = () => {
          if (!ws1Joined) {
            ws1Joined = true;
            checkAndSend();
          }
        };

        ws2.onmessage = (event) => {
          if (!ws2Joined) {
            ws2Joined = true;
            checkAndSend();
          }
          try {
            const msg = JSON.parse(event.data);
            ws2Messages.push(msg);
            if (msg.type === "pad-hit") {
              ws1.close();
              ws2.close();
              resolve({ success: true, padHit: msg });
            }
          } catch {
            // ignore
          }
        };

        function checkAndSend() {
          if (ws1Joined && ws2Joined) {
            // Send pad-hit from controller
            ws1.send(JSON.stringify({ type: "pad-hit", padIndex: 5 }));
          }
        }

        ws1.onerror = ws2.onerror = () => {
          resolve({ success: false, error: "connection error" });
        };

        setTimeout(() => {
          ws1.close();
          ws2.close();
          resolve({ success: false, ws2Messages, timeout: true });
        }, 5000);
      });
    }, roomId);

    expect(result).toHaveProperty("success", true);
    expect((result as any).padHit).toMatchObject({ type: "pad-hit", padIndex: 5 });
  });

  test("heartbeat receives pong response", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Create New Room" }).click();
    await expect(page).toHaveURL(/\/r\/[a-f0-9-]+/, { timeout: 10000 });

    const roomId = page.url().split("/r/")[1];

    const result = await page.evaluate(async (roomId) => {
      return new Promise((resolve) => {
        const ws = new WebSocket("ws://localhost:5174/ws");
        const messages: any[] = [];

        ws.onopen = () => {
          ws.send(JSON.stringify({ type: "join", roomId, role: "controller" }));
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            messages.push(msg);

            // After joining, send heartbeat
            if (msg.type === "sync-state") {
              ws.send(JSON.stringify({ type: "heartbeat" }));
            }

            // Check for pong
            if (msg.type === "pong") {
              ws.close();
              resolve({ success: true, messages });
            }
          } catch {
            // ignore
          }
        };

        ws.onerror = () => {
          resolve({ success: false, error: "connection error" });
        };

        setTimeout(() => {
          ws.close();
          resolve({ success: false, messages, timeout: true });
        }, 3000);
      });
    }, roomId);

    expect(result).toHaveProperty("success", true);
    expect((result as any).messages).toContainEqual({ type: "pong" });
  });

  test("invalid message returns error", async ({ page }) => {
    await page.goto("/");

    const result = await page.evaluate(async () => {
      return new Promise((resolve) => {
        const ws = new WebSocket("ws://localhost:5174/ws");
        const messages: any[] = [];

        ws.onopen = () => {
          // Send invalid message
          ws.send("not valid json {{{");
        };

        ws.onmessage = (event) => {
          try {
            messages.push(JSON.parse(event.data));
          } catch {
            messages.push(event.data);
          }

          if (messages.some((m) => m.type === "error")) {
            ws.close();
            resolve({ success: true, messages });
          }
        };

        ws.onerror = () => {
          resolve({ success: false, error: "connection error" });
        };

        setTimeout(() => {
          ws.close();
          resolve({ success: false, messages, timeout: true });
        }, 2000);
      });
    });

    expect(result).toHaveProperty("success", true);
    expect((result as any).messages).toContainEqual(
      expect.objectContaining({ type: "error" })
    );
  });
});
