# E2E Tests

Playwright-based end-to-end tests for the frontend application.

## Structure

```
e2e/
├── fixtures/          # Test helpers and fixtures
│   └── test-helpers.ts
└── tests/             # Test files
    └── vrm-viewer.spec.ts
```

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run tests in UI mode (interactive)
npm run test:e2e:ui

# Run tests in headed mode (visible browser)
npm run test:e2e:headed

# Run specific test file
npx playwright test e2e/tests/vrm-viewer.spec.ts

# Run tests in specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## Test Status

| Test Suite | Status | Notes |
|------------|--------|-------|
| vrm-viewer.spec.ts | ⏸️ SKIPPED | VRMViewer not yet integrated into roleplay page (T-012) |

## Prerequisites

- Node.js 18+
- Playwright browsers installed: `npx playwright install`
- Development server running on http://localhost:3000

## Writing Tests

### Test Structure

```typescript
import { test, expect } from '@playwright/test';
import { waitForVRMViewerLoad } from '../fixtures/test-helpers';

test.describe('Feature Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/roleplay/1');
  });

  test('should do something', async ({ page }) => {
    await waitForVRMViewerLoad(page);
    // Test implementation
  });
});
```

### Using Test Helpers

```typescript
import {
  waitForVRMViewerLoad,
  rotateCamera,
  zoomCamera,
  measureFPS,
} from '../fixtures/test-helpers';

test('camera rotation', async ({ page }) => {
  await waitForVRMViewerLoad(page);
  await rotateCamera(page, 100, 50);
  // Assertions
});
```

## Configuration

See `playwright.config.ts` for configuration details:

- Base URL: http://localhost:3000
- Test directory: `./e2e/tests`
- Browsers: Chromium, Firefox, WebKit
- Auto-start dev server if not running

## CI/CD Integration

The test configuration automatically adjusts for CI environments:

- Retries: 2 in CI, 0 locally
- Workers: 1 in CI, unlimited locally
- Screenshots: Only on failure
- Video: Only on failure
- Traces: On first retry

## Debugging

```bash
# Run with debug mode
npx playwright test --debug

# View HTML report
npx playwright show-report

# Generate trace
npx playwright test --trace on
npx playwright show-trace trace.zip
```

## Best Practices

1. Use test helpers for common operations
2. Wait for elements before interacting
3. Use meaningful test descriptions
4. Clean up resources in afterEach
5. Use fixtures for test data
6. Avoid hard-coded timeouts when possible
7. Test both happy paths and error cases
8. Verify accessibility when applicable

## Coverage Goals

- User workflows: 90%+
- Error handling: 100%
- Responsive behavior: 80%+
- Accessibility: 70%+
