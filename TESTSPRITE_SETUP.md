# TestSprite MCP Setup Guide for TaxFormatter

> Comprehensive AI-powered testing setup for your crypto tax CSV processing application.

## Overview

TestSprite is an AI testing agent that automatically generates, executes, and analyzes tests for your application. It integrates with your IDE via MCP (Model Context Protocol) to provide autonomous testing capabilities.

## Quick Start

### Step 1: Get Your API Key

1. **Sign up at TestSprite**: https://www.testsprite.com
2. **Navigate to Dashboard**: https://www.testsprite.com/dashboard
3. **Generate API Key**: Settings → API Keys → Create New Key
4. **Copy your key** (starts with `ts_...`)

### Step 2: Install TestSprite MCP

```bash
# Global installation (recommended)
npm install -g @testsprite/testsprite-mcp@latest

# Or use npx directly (no install needed)
npx @testsprite/testsprite-mcp
```

### Step 3: Configure Environment

Create or update `.env.local` with your TestSprite API key:

```env
# TestSprite Configuration
TESTSPRITE_API_KEY=ts_your_api_key_here
TESTSPRITE_PROJECT_ID=taxformatter
```

### Step 4: Configure MCP Server

#### For Cursor IDE

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "testsprite": {
      "command": "npx",
      "args": ["@testsprite/testsprite-mcp"],
      "env": {
        "TESTSPRITE_API_KEY": "ts_your_api_key_here"
      }
    }
  }
}
```

#### For VS Code with Claude Extension

Add to your workspace settings or `~/.vscode/mcp.json`:

```json
{
  "mcpServers": {
    "testsprite": {
      "command": "npx",
      "args": ["@testsprite/testsprite-mcp"],
      "env": {
        "TESTSPRITE_API_KEY": "ts_your_api_key_here"
      }
    }
  }
}
```

#### For Claude Desktop / Windsurf

Add to your MCP configuration file:

```json
{
  "mcpServers": {
    "testsprite": {
      "command": "npx",
      "args": ["@testsprite/testsprite-mcp"],
      "env": {
        "TESTSPRITE_API_KEY": "ts_your_api_key_here"
      }
    }
  }
}
```

### Step 5: Restart Your IDE

After configuring, restart your IDE to load the TestSprite MCP server.

---

## Project Configuration

### Create TestSprite Config File

Create `testsprite.config.json` in project root:

```json
{
  "projectName": "TaxFormatter",
  "projectDescription": "Crypto CSV repair and tax categorization tool",
  "framework": "next.js",
  "language": "typescript",
  "testRunner": "jest",
  "e2eRunner": "playwright",

  "directories": {
    "source": ["app", "components", "lib", "hooks", "contexts"],
    "tests": ["__tests__", "e2e"],
    "api": ["app/api"]
  },

  "features": {
    "authentication": {
      "provider": "next-auth",
      "methods": ["email-password", "google-oauth", "2fa-totp"]
    },
    "payments": {
      "provider": "stripe",
      "flows": ["checkout", "subscriptions", "webhooks"]
    },
    "storage": {
      "provider": "aws-s3",
      "operations": ["presigned-upload", "presigned-download"]
    },
    "database": {
      "provider": "neon-postgres",
      "tables": ["users", "accounts", "subscriptions", "uploads", "jobs", "transactions", "ai_cache", "downloads"]
    }
  },

  "criticalPaths": [
    "User Registration → Email Verification → Login",
    "CSV Upload → Processing → Download",
    "Stripe Checkout → Webhook → Subscription Activation",
    "2FA Setup → Login with 2FA → Backup Code Recovery"
  ],

  "securityFocus": [
    "rate-limiting",
    "input-validation",
    "sql-injection-prevention",
    "xss-prevention",
    "csrf-protection"
  ],

  "coverage": {
    "target": 90,
    "critical": 100,
    "exclude": ["node_modules", ".next", "coverage", "public"]
  }
}
```

### Create PRD File (Product Requirements Document)

TestSprite uses your PRD to understand product intent. Create `PRD.md`:

```markdown
# TaxFormatter - Product Requirements Document

## Product Overview
TaxFormatter is a crypto tax CSV processing tool that:
1. Accepts CSV exports from 12+ cryptocurrency exchanges
2. Automatically detects and parses exchange formats
3. Uses AI to categorize transactions
4. Converts to tax software formats (Koinly, TurboTax, CoinLedger, ZenLedger)

## User Flows

### 1. Registration & Authentication
- Email/password registration with verification code
- Google OAuth login
- 2FA setup (TOTP + backup codes)
- Password reset flow

### 2. CSV Processing Flow
- User uploads CSV file
- System generates S3 presigned URL
- File uploaded directly to S3
- Lambda processes file (exchange detection, parsing, AI categorization)
- User polls for job status (every 2.5s)
- User selects tax software format
- User downloads converted CSV

### 3. Subscription Flow
- Free tier: 3 downloads/month, Gemini AI
- Pro tier: Unlimited downloads, Claude Sonnet AI
- Premium tier: All Pro + Claude Opus AI

## Technical Requirements

### Security Requirements
- Rate limiting: 5 auth attempts/15min, 100 API calls/min
- Input validation with Zod schemas
- SQL injection and XSS prevention
- CSRF token validation
- Secure session management (30-day JWT)

### Performance Requirements
- Page load: <3s
- API response: <500ms
- File processing: <60s for typical CSV

### Reliability Requirements
- 99.9% uptime target
- Graceful error handling
- Retry logic for failed jobs

## Supported Exchanges
Coinbase, Kraken, Gemini, Binance, Robinhood, Crypto.com, PayPal, Cash App, Venmo, KuCoin, Bybit, FTX

## Export Formats
- Koinly Universal Template
- TurboTax Form 8949
- CoinLedger Universal Manual Import
- ZenLedger Custom CSV
```

---

## Using TestSprite

### Available Commands

Once TestSprite MCP is configured, you can use these commands in your AI assistant:

#### Generate Tests
```
"Generate comprehensive tests for the authentication flow"
"Create unit tests for lib/validation.ts"
"Write E2E tests for the CSV upload flow"
```

#### Run Tests
```
"Run all tests and show me the results"
"Execute the authentication test suite"
"Run E2E tests for the dashboard"
```

#### Analyze Coverage
```
"Analyze test coverage and identify gaps"
"What areas need more test coverage?"
"Generate a coverage report"
```

#### Debug Failures
```
"Debug the failing tests and suggest fixes"
"Why is the auth test failing?"
"Fix the test failures in api/auth/register.test.ts"
```

### TestSprite Core Tools

TestSprite MCP provides 7 core tools:

1. **test_generate** - Generate smart test cases from your code
2. **test_execute** - Run tests and collect results
3. **test_analyze** - Analyze test results and coverage
4. **test_debug** - Diagnose test failures
5. **test_fix** - Auto-fix failing tests
6. **test_plan** - Create comprehensive test plans
7. **test_report** - Generate detailed test reports

---

## Integration with Existing Tests

### Current Test Status (from TESTING_PROGRESS.md)

| Category | Tests | Coverage |
|----------|-------|----------|
| Security Utilities | 114 | ~90% |
| UI Components | 98 | High |
| Dashboard Components | 62 | Medium |
| Hooks | 16 | High |
| API Routes | 71 | ~90% |
| Marketing Components | 54 | Medium |
| **Total** | **415** | **Phase 2 Complete** |

### Gaps to Fill with TestSprite

1. **E2E Tests** - Currently 0 coverage
2. **Integration Tests** - Critical user journeys not tested
3. **API Endpoints Missing Tests**:
   - `/api/uploads/presigned-url`
   - `/api/uploads/[uploadId]/confirm`
   - `/api/jobs/[jobId]`
   - `/api/jobs/[jobId]/download`
   - `/api/jobs/[jobId]/insights`
   - `/api/jobs/[jobId]/retry`
   - `/api/checkout`
   - `/api/customer-portal`
   - `/api/webhooks/stripe`
   - `/api/auth/2fa/*` endpoints

4. **Component Tests Missing**:
   - TaxSoftwareSelector
   - ExchangeSelector
   - AIInsightsPanel
   - AnalysisAnimation
   - ProcessingTerminal
   - BankPDFUploader

---

## Test Execution Scripts

Add these to your `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    "test:all": "npm run test && npm run test:e2e",
    "test:ci": "jest --ci --coverage && playwright test"
  }
}
```

---

## CI/CD Integration

### GitHub Actions Workflow

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Build application
        run: npm run build

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Troubleshooting

### Common Issues

1. **API Key Not Working**
   - Verify key starts with `ts_`
   - Check key is not expired
   - Ensure environment variable is set correctly

2. **MCP Server Not Connecting**
   - Restart your IDE
   - Check MCP configuration syntax
   - Verify npx can access the package

3. **Tests Not Running**
   - Ensure Jest/Playwright are installed
   - Check test file naming (`*.test.ts`, `*.spec.ts`)
   - Verify jest.config.js is correct

### Support

- Documentation: https://docs.testsprite.com
- GitHub: https://github.com/TestSprite/testsprite-mcp
- Support: support@testsprite.com

---

## Next Steps

1. ✅ Get TestSprite API key
2. ✅ Install and configure MCP server
3. ✅ Create project configuration files
4. 🔲 Run initial test generation
5. 🔲 Execute comprehensive test suite
6. 🔲 Review coverage report
7. 🔲 Set up CI/CD integration

---

*Last Updated: January 2026*
