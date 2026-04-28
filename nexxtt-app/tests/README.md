# Playwright Tests

This directory contains end-to-end tests for the Nexxtt.io application.

## Prerequisites

- Node.js installed
- The app running on http://localhost:3000
- Playwright browsers installed (run: `npx playwright install`)

## Running Tests

### Run all tests
```bash
npx playwright test
```

### Run tests with UI
```bash
npx playwright test --ui
```

### Run specific test file
```bash
npx playwright test tests/01-login.spec.js
```

### Run tests in headed mode (see browser)
```bash
npx playwright test --headed
```

### Run tests with console output
```bash
npx playwright test --reporter=list
```

## Test Files

| File | Description |
|------|-------------|
| `01-login.spec.js` | Login flow tests |
| `02-admin.spec.js` | Admin portal tests |
| `03-agency.spec.js` | Agency portal tests |
| `04-client-portal.spec.js` | White-label client portal tests |
| `05-direct-client.spec.js` | Direct client portal tests |
| `06-crud-operations.spec.js` | CRUD operation tests |
| `07-navigation.spec.js` | Navigation and auth tests |

## Demo Users

The tests use demo accounts configured in the app:

- **Admin**: riya@nexxtt.io
- **Agency**: alex@brightagency.com.au
- **Client**: sarah@coastalrealty.com.au
- **Direct Client**: marcus@techcore.com

Password: `demo1234` (default for demo accounts)

## Configuration

See `playwright.config.js` for test configuration.
