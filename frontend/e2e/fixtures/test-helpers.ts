/**
 * E2E Test Helpers
 * Utility functions for VRMViewer E2E tests
 */

import { Page, expect } from '@playwright/test';

/**
 * Wait for VRMViewer to be fully loaded
 */
export async function waitForVRMViewerLoad(page: Page, timeout = 10000) {
  // Wait for canvas to be visible
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible({ timeout });

  // Wait for loading indicator to disappear
  const loadingText = page.getByText(/モデル読み込み中/);
  await expect(loadingText).not.toBeVisible({ timeout });
}

/**
 * Check if WebGL is supported and initialized
 */
export async function isWebGLInitialized(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return false;
    const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
    return !!context;
  });
}

/**
 * Get canvas bounding box center point
 */
export async function getCanvasCenter(page: Page): Promise<{ x: number; y: number }> {
  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();

  if (!box) {
    throw new Error('Canvas not found or not visible');
  }

  return {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  };
}

/**
 * Simulate camera rotation with mouse drag
 */
export async function rotateCamera(
  page: Page,
  deltaX: number,
  deltaY: number,
  steps = 10
) {
  const center = await getCanvasCenter(page);

  await page.mouse.move(center.x, center.y);
  await page.mouse.down();
  await page.mouse.move(center.x + deltaX, center.y + deltaY, { steps });
  await page.mouse.up();

  // Wait for animation to settle
  await page.waitForTimeout(300);
}

/**
 * Simulate camera zoom with mouse wheel
 */
export async function zoomCamera(page: Page, delta: number) {
  const center = await getCanvasCenter(page);

  await page.mouse.move(center.x, center.y);
  await page.mouse.wheel(0, delta);

  // Wait for animation to settle
  await page.waitForTimeout(300);
}

/**
 * Take screenshot of canvas for visual comparison
 */
export async function takeCanvasScreenshot(
  page: Page,
  filename: string
): Promise<Buffer> {
  const canvas = page.locator('canvas');
  return canvas.screenshot({ path: filename });
}

/**
 * Mock model file response
 */
export async function mockModelFile(
  page: Page,
  status: number,
  body?: string | Buffer
) {
  await page.route('**/models/*.vrm', (route) => {
    if (body) {
      route.fulfill({
        status,
        contentType: 'application/octet-stream',
        body,
      });
    } else {
      route.fulfill({ status });
    }
  });
}

/**
 * Check if error message is displayed
 */
export async function hasErrorMessage(page: Page): Promise<boolean> {
  const errorMessage = page.getByText(/モデルの読み込みに失敗しました/);
  try {
    await expect(errorMessage).toBeVisible({ timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Click retry button
 */
export async function clickRetryButton(page: Page) {
  const retryButton = page.getByRole('button', { name: /再試行/ });
  await retryButton.click();
}

/**
 * Measure FPS over specified duration
 */
export async function measureFPS(page: Page, durationMs = 2000): Promise<number> {
  return page.evaluate((duration) => {
    return new Promise<number>((resolve) => {
      let frames = 0;
      const startTime = performance.now();

      const countFrame = () => {
        frames++;
        if (performance.now() - startTime < duration) {
          requestAnimationFrame(countFrame);
        } else {
          const avgFPS = frames / (duration / 1000);
          resolve(avgFPS);
        }
      };

      requestAnimationFrame(countFrame);
    });
  }, durationMs);
}

/**
 * Get canvas dimensions
 */
export async function getCanvasDimensions(
  page: Page
): Promise<{ width: number; height: number }> {
  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();

  if (!box) {
    throw new Error('Canvas not found or not visible');
  }

  return {
    width: box.width,
    height: box.height,
  };
}

/**
 * Test user credentials (from CLAUDE.md)
 */
export const TEST_USER = {
  email: 'e2e_simple@test.com',
  password: 'password123',
  username: 'e2e_tester',
};
