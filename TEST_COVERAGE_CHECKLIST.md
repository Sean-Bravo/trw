# Test Coverage Checklist for TaxReadyWallet

## Overview
This comprehensive checklist ensures 100% test coverage for all critical functionality, security features, and user-facing components. Tests should cover unit, integration, and end-to-end scenarios.

## Testing Stack Setup

### Required Dependencies
```bash
npm install --save-dev \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  @testing-library/hooks \
  jest \
  jest-environment-jsdom \
  @types/jest \
  ts-node \
  ts-jest \
  msw \
  @faker-js/faker \
  @playwright/test \
  vitest \
  @vitejs/plugin-react
```

### Test Configuration Files Needed
- [ ] `jest.config.js` or `vitest.config.ts`
- [ ] `jest.setup.js` - Test environment setup
- [ ] `.test-utils.tsx` - Custom render functions and providers
- [ ] `__mocks__/` directory for mocking external dependencies
- [ ] `playwright.config.ts` - E2E test configuration

---

## 1. UI Components Testing

### 1.1 Core UI Components (`components/ui/`)

#### **Button Component** (`components/ui/Button.tsx`)
**Test File:** `components/ui/__tests__/Button.test.tsx`

- [ ] Renders with default props
- [ ] Renders different variants (primary, secondary, outline, ghost, link)
- [ ] Renders different sizes (sm, md, lg)
- [ ] Handles onClick events correctly
- [ ] Shows loading state with spinner
- [ ] Disables button when disabled prop is true
- [ ] Prevents click when disabled
- [ ] Renders children correctly
- [ ] Applies custom className
- [ ] Forwards ref correctly
- [ ] Renders asChild variant (Radix pattern)
- [ ] Keyboard accessibility (Enter, Space)
- [ ] ARIA attributes are correct

**Priority:** HIGH (used throughout app)
**Estimated Tests:** 15-20 test cases

---

#### **Input Component** (`components/ui/Input.tsx`)
**Test File:** `components/ui/__tests__/Input.test.tsx`

- [ ] Renders with placeholder
- [ ] Renders with label
- [ ] Shows error state and error message
- [ ] Handles onChange events
- [ ] Handles onBlur events
- [ ] Forwards ref to input element
- [ ] Uses React.useId() for unique IDs
- [ ] Falls back to provided id prop
- [ ] Required field shows asterisk
- [ ] Disabled state works correctly
- [ ] Different input types (text, email, password, number)
- [ ] Applies custom className to wrapper
- [ ] Label clicks focus the input
- [ ] Error message has correct ARIA attributes
- [ ] Auto-focus works when specified

**Priority:** HIGH (form inputs critical for data entry)
**Estimated Tests:** 15-18 test cases

---

#### **Modal Component** (`components/ui/Modal.tsx`)
**Test File:** `components/ui/__tests__/Modal.test.tsx`

- [ ] Renders when isOpen is true
- [ ] Does not render when isOpen is false
- [ ] Calls onClose when close button clicked
- [ ] Calls onClose when overlay clicked
- [ ] Does NOT close when clicking modal content
- [ ] Traps focus within modal when open
- [ ] Focuses first focusable element on open
- [ ] Tab cycles through focusable elements
- [ ] Shift+Tab cycles backward
- [ ] Pressing Escape calls onClose
- [ ] Pressing Escape does nothing if preventClose is true
- [ ] Restores focus to trigger element on close
- [ ] Prevents body scroll when open
- [ ] Renders title correctly
- [ ] Renders children correctly
- [ ] Portal renders in document.body
- [ ] Multiple modals can be stacked
- [ ] ARIA attributes (role="dialog", aria-modal, aria-labelledby)

**Priority:** HIGH (accessibility critical)
**Estimated Tests:** 18-22 test cases

---

#### **Card Component** (`components/ui/Card.tsx`)
**Test File:** `components/ui/__tests__/Card.test.tsx`

- [ ] Renders children correctly
- [ ] Applies custom className
- [ ] Renders with default styling
- [ ] Forwards ref correctly
- [ ] Handles hover states (if interactive)
- [ ] Renders as different HTML elements (div, article, section)

**Priority:** MEDIUM
**Estimated Tests:** 6-8 test cases

---

#### **Accordion Component** (`components/ui/Accordion.tsx`)
**Test File:** `components/ui/__tests__/Accordion.test.tsx`

- [ ] Renders all items
- [ ] Expands item on click
- [ ] Collapses item on second click
- [ ] Only one item open at a time (if exclusive)
- [ ] Multiple items can be open (if not exclusive)
- [ ] Keyboard navigation (Arrow Up/Down)
- [ ] Enter/Space toggles expansion
- [ ] ARIA attributes (aria-expanded, aria-controls)
- [ ] Icon rotates on expansion
- [ ] Content height animates smoothly
- [ ] defaultOpen prop works
- [ ] Controlled vs uncontrolled mode

**Priority:** MEDIUM
**Estimated Tests:** 12-15 test cases

---

#### **Badge Component** (`components/ui/Badge.tsx`)
**Test File:** `components/ui/__tests__/Badge.test.tsx`

- [ ] Renders with text
- [ ] Applies different variants (default, primary, secondary, success, warning, danger)
- [ ] Applies custom className
- [ ] Renders children correctly

**Priority:** LOW
**Estimated Tests:** 5-6 test cases

---

#### **Toast Component** (`components/ui/Toast.tsx`)
**Test File:** `components/ui/__tests__/Toast.test.tsx`

- [ ] Renders toast message
- [ ] Auto-dismisses after duration
- [ ] Does not auto-dismiss if duration is 0
- [ ] Close button dismisses toast
- [ ] Different toast types (success, error, warning, info)
- [ ] Multiple toasts can be shown
- [ ] Toast positions correctly (top, bottom, left, right)
- [ ] Animation on enter and exit
- [ ] ARIA live region for screen readers
- [ ] Icon matches toast type

**Priority:** MEDIUM
**Estimated Tests:** 10-12 test cases

---

#### **Tooltip Component** (`components/ui/Tooltip.tsx`)
**Test File:** `components/ui/__tests__/Tooltip.test.tsx`

- [ ] Shows tooltip on hover
- [ ] Hides tooltip on mouse leave
- [ ] Shows tooltip on focus
- [ ] Hides tooltip on blur
- [ ] Positions correctly (top, bottom, left, right)
- [ ] Adjusts position if overflows viewport
- [ ] Delay before showing
- [ ] ARIA attributes (aria-describedby)
- [ ] Portal renders correctly

**Priority:** LOW
**Estimated Tests:** 9-10 test cases

---

#### **Logo Component** (`components/ui/Logo.tsx`)
**Test File:** `components/ui/__tests__/Logo.test.tsx`

- [ ] Renders SVG correctly
- [ ] Applies custom className
- [ ] Has correct viewBox and dimensions
- [ ] Alt text for accessibility

**Priority:** LOW
**Estimated Tests:** 4-5 test cases

---

#### **StarRating Component** (`components/ui/StarRating.tsx`)
**Test File:** `components/ui/__tests__/StarRating.test.tsx`

- [ ] Renders correct number of stars
- [ ] Shows filled stars for rating
- [ ] Shows empty stars for remaining
- [ ] Shows half stars if supported
- [ ] Read-only mode prevents interaction
- [ ] Interactive mode allows selecting rating
- [ ] Hover preview shows rating
- [ ] ARIA label describes rating
- [ ] Keyboard interaction (Arrow keys)

**Priority:** LOW
**Estimated Tests:** 9-10 test cases

---

### 1.2 Marketing Components (`components/marketing/`)

#### **Hero Component** (`components/marketing/Hero.tsx`)
**Test File:** `components/marketing/__tests__/Hero.test.tsx`

- [ ] Renders hero heading
- [ ] Renders subheading/description
- [ ] Renders CTA buttons
- [ ] CTA buttons link to correct routes
- [ ] Animation triggers on scroll
- [ ] Uses useScrollAnimation hook correctly
- [ ] Renders visual elements (gauges, bars)
- [ ] Responsive layout changes
- [ ] Gradient background renders

**Priority:** MEDIUM
**Estimated Tests:** 9-10 test cases

---

#### **Pricing Component** (`components/marketing/Pricing.tsx`)
**Test File:** `components/marketing/__tests__/Pricing.test.tsx`

- [ ] Renders monthly pricing by default
- [ ] Toggles to annual pricing
- [ ] Displays correct prices for each plan
- [ ] Shows "Popular" badge on correct plan
- [ ] Shows original price and savings for annual
- [ ] Renders all plan features
- [ ] CTA buttons work correctly
- [ ] Type safety with PricingPlan interface
- [ ] No type assertions (fixed in code review)

**Priority:** HIGH (business critical)
**Estimated Tests:** 9-10 test cases

---

#### **CostOfClarity Component** (`components/marketing/CostOfClarity.tsx`)
**Test File:** `components/marketing/__tests__/CostOfClarity.test.tsx`

- [ ] Renders section heading
- [ ] Displays all cost examples
- [ ] Animations trigger on scroll
- [ ] Responsive grid layout

**Priority:** LOW
**Estimated Tests:** 4-5 test cases

---

#### **ExportFormats Component** (`components/marketing/ExportFormats.tsx`)
**Test File:** `components/marketing/__tests__/ExportFormats.test.tsx`

- [ ] Renders all export format options
- [ ] Displays format icons/logos
- [ ] Shows format descriptions
- [ ] Animation on scroll

**Priority:** LOW
**Estimated Tests:** 4-5 test cases

---

#### **FAQ Component** (`components/marketing/FAQ.tsx`)
**Test File:** `components/marketing/__tests__/FAQ.test.tsx`

- [ ] Renders all FAQ items
- [ ] Uses Accordion component correctly
- [ ] Questions expand/collapse
- [ ] All Q&A content renders

**Priority:** LOW
**Estimated Tests:** 4-5 test cases

---

#### **FinalCTA Component** (`components/marketing/FinalCTA.tsx`)
**Test File:** `components/marketing/__tests__/FinalCTA.test.tsx`

- [ ] Renders CTA heading
- [ ] Renders CTA button
- [ ] Button links correctly
- [ ] Background styling applies

**Priority:** LOW
**Estimated Tests:** 4 test cases

---

#### **Footer Component** (`components/marketing/Footer.tsx`)
**Test File:** `components/marketing/__tests__/Footer.test.tsx`

- [ ] Renders logo
- [ ] Renders all footer links
- [ ] Links navigate correctly
- [ ] Copyright year is current
- [ ] Social media links (if present)
- [ ] Accessibility links

**Priority:** LOW
**Estimated Tests:** 6-7 test cases

---

#### **HowItWorks Component** (`components/marketing/HowItWorks.tsx`)
**Test File:** `components/marketing/__tests__/HowItWorks.test.tsx`

- [ ] Renders section heading
- [ ] Displays all steps
- [ ] Step numbers display correctly
- [ ] Step descriptions render
- [ ] Animation on scroll
- [ ] Visual connectors between steps

**Priority:** MEDIUM
**Estimated Tests:** 6-7 test cases

---

#### **InteractiveDemo Component** (`components/marketing/InteractiveDemo.tsx`)
**Test File:** `components/marketing/__tests__/InteractiveDemo.test.tsx`

- [ ] Renders demo interface
- [ ] File upload simulation works
- [ ] Progress indicator updates
- [ ] Demo interactions are functional
- [ ] Reset demo button works
- [ ] Visual feedback for user actions

**Priority:** MEDIUM
**Estimated Tests:** 6-8 test cases

---

#### **SecurityFeatures Component** (`components/marketing/SecurityFeatures.tsx`)
**Test File:** `components/marketing/__tests__/SecurityFeatures.test.tsx`

- [ ] Renders all security features
- [ ] Icons display for each feature
- [ ] Feature descriptions render
- [ ] Grid layout responsive
- [ ] Accurate security claims (no false SOC 2/GDPR)

**Priority:** MEDIUM (accuracy critical)
**Estimated Tests:** 5-6 test cases

---

#### **SupportedExchanges Component** (`components/marketing/SupportedExchanges.tsx`)
**Test File:** `components/marketing/__tests__/SupportedExchanges.test.tsx`

- [ ] Renders section heading
- [ ] Displays all exchange logos
- [ ] Logos have alt text
- [ ] Grid layout responsive
- [ ] Coming soon badge for future exchanges

**Priority:** LOW
**Estimated Tests:** 5-6 test cases

---

#### **Testimonials Component** (`components/marketing/Testimonials.tsx`)
**Test File:** `components/marketing/__tests__/Testimonials.test.tsx`

- [ ] Renders all testimonials
- [ ] Shows star ratings
- [ ] Displays customer names
- [ ] Shows customer roles/companies
- [ ] Carousel/slider works (if present)
- [ ] Avatar images render

**Priority:** LOW
**Estimated Tests:** 6-7 test cases

---

#### **Header Component** (`components/marketing/Header.tsx`)
**Test File:** `components/marketing/__tests__/Header.test.tsx`

- [ ] Renders logo
- [ ] Renders navigation links
- [ ] Mobile menu toggle works
- [ ] Navigation links are correct
- [ ] Sticky header on scroll
- [ ] Security badges show correct claims (not false SOC 2/GDPR)
- [ ] Login/Signup buttons present
- [ ] Dropdown menus work

**Priority:** HIGH (visible on every page)
**Estimated Tests:** 8-10 test cases

---

### 1.3 Layout Components (`components/layout/`)

#### **Container Component** (`components/layout/Container.tsx`)
**Test File:** `components/layout/__tests__/Container.test.tsx`

- [ ] Renders children correctly
- [ ] Applies max-width constraint
- [ ] Centers content
- [ ] Applies responsive padding
- [ ] Custom className support

**Priority:** LOW
**Estimated Tests:** 5 test cases

---

## 2. Hooks Testing

### **useScrollAnimation Hook** (`hooks/useScrollAnimation.ts`)
**Test File:** `hooks/__tests__/useScrollAnimation.test.ts`

- [ ] Returns ref and isVisible state
- [ ] isVisible starts as false
- [ ] isVisible becomes true when element enters viewport
- [ ] Respects threshold option
- [ ] Respects rootMargin option
- [ ] Unobserves element after first intersection
- [ ] Options are stabilized with useRef
- [ ] Cleanup function unobserves element
- [ ] Works with multiple instances
- [ ] No memory leaks on unmount

**Priority:** HIGH (used extensively)
**Estimated Tests:** 10-12 test cases

---

## 3. Security Utilities Testing

### 3.1 Rate Limiting (`lib/rate-limit.ts`)
**Test File:** `lib/__tests__/rate-limit.test.ts`

#### **RateLimiter Class**
- [ ] Initializes with config correctly
- [ ] Allows requests within limit
- [ ] Blocks requests exceeding limit
- [ ] Returns correct limit, remaining, reset values
- [ ] Resets count after interval expires
- [ ] Handles multiple identifiers independently
- [ ] check() method is async and returns correct structure
- [ ] Store cleanup runs periodically
- [ ] No race conditions with concurrent requests
- [ ] Memory doesn't leak with many identifiers

#### **getClientIdentifier Function**
- [ ] Extracts IP from x-forwarded-for header
- [ ] Extracts IP from x-real-ip header
- [ ] Extracts IP from cf-connecting-ip header (Cloudflare)
- [ ] Handles multiple IPs in x-forwarded-for (uses first)
- [ ] Trims whitespace from IP
- [ ] Returns 'unknown' if no IP headers present
- [ ] Prioritizes cf-connecting-ip over others

#### **applyRateLimit Function**
- [ ] Returns null when under limit
- [ ] Returns 429 response when over limit
- [ ] Sets X-RateLimit headers on success
- [ ] Sets X-RateLimit headers on failure
- [ ] Sets Retry-After header on failure
- [ ] Response includes error message
- [ ] Works with different RateLimiter configs

#### **Pre-configured Limiters**
- [ ] api limiter: 100 requests/minute
- [ ] auth limiter: 5 requests/15 minutes
- [ ] contactForm limiter: 3 requests/hour
- [ ] fileUpload limiter: 10 requests/hour

**Priority:** CRITICAL (security feature)
**Estimated Tests:** 25-30 test cases

---

### 3.2 Input Validation (`lib/validation.ts`)
**Test File:** `lib/__tests__/validation.test.ts`

#### **Zod Schemas**
- [ ] emailSchema validates correct emails
- [ ] emailSchema rejects invalid emails
- [ ] emailSchema lowercases and trims
- [ ] passwordSchema requires 8+ characters
- [ ] passwordSchema requires uppercase letter
- [ ] passwordSchema requires lowercase letter
- [ ] passwordSchema requires number
- [ ] passwordSchema requires special character
- [ ] passwordSchema rejects passwords > 128 chars
- [ ] nameSchema validates correct names
- [ ] nameSchema rejects names with numbers
- [ ] nameSchema rejects names with special chars (except -')
- [ ] nameSchema trims whitespace
- [ ] urlSchema validates URLs
- [ ] fileUploadSchema validates file size (10MB max)
- [ ] fileUploadSchema validates file types (CSV only)

#### **sanitizeHtml Function**
- [ ] Escapes < to &lt;
- [ ] Escapes > to &gt;
- [ ] Escapes " to &quot;
- [ ] Escapes ' to &#x27;
- [ ] Escapes / to &#x2F;
- [ ] Handles empty strings
- [ ] Handles strings without special chars

#### **sanitizeString Function**
- [ ] Removes control characters
- [ ] Replaces multiple spaces with single space
- [ ] Trims leading/trailing whitespace
- [ ] Handles empty strings

#### **validateEmail Function**
- [ ] Returns success:true for valid emails
- [ ] Returns success:false for invalid emails
- [ ] Returns sanitized email in data
- [ ] Returns error message on failure
- [ ] Sanitizes before validating

#### **validatePassword Function**
- [ ] Returns success:true for valid passwords
- [ ] Returns success:false for weak passwords
- [ ] Returns specific error messages
- [ ] Does not leak password in error

#### **validateName Function**
- [ ] Returns success:true for valid names
- [ ] Returns success:false for invalid names
- [ ] Returns sanitized name in data
- [ ] Returns error message on failure

#### **detectSqlInjection Function**
- [ ] Detects SELECT statements
- [ ] Detects INSERT statements
- [ ] Detects UPDATE statements
- [ ] Detects DELETE statements
- [ ] Detects DROP statements
- [ ] Detects UNION statements
- [ ] Detects SQL comments (--)
- [ ] Detects OR patterns (OR 1=1)
- [ ] Detects AND patterns
- [ ] Returns false for safe strings
- [ ] Case-insensitive detection

#### **detectXss Function**
- [ ] Detects <script> tags
- [ ] Detects <iframe> tags
- [ ] Detects javascript: protocol
- [ ] Detects event handlers (onclick, onload, etc.)
- [ ] Detects <embed> tags
- [ ] Detects <object> tags
- [ ] Returns false for safe strings
- [ ] Case-insensitive detection

#### **validateFileUpload Function**
- [ ] Validates file size
- [ ] Validates file type
- [ ] Rejects files with .. in name (path traversal)
- [ ] Returns success for valid files
- [ ] Returns error message for invalid files

#### **generateCsrfToken Function**
- [ ] Generates 64-character hex string
- [ ] Each token is unique
- [ ] Uses crypto.getRandomValues
- [ ] Token matches hex pattern

#### **validateCsrfToken Function**
- [ ] Returns true for matching tokens
- [ ] Returns false for non-matching tokens
- [ ] Returns false if token is empty
- [ ] Returns false if expectedToken is empty
- [ ] Returns false if lengths differ
- [ ] Uses constant-time comparison (no timing attacks)
- [ ] Handles unicode characters

**Priority:** CRITICAL (security foundation)
**Estimated Tests:** 60-70 test cases

---

## 4. API Route Testing

### 4.1 NextAuth API Route (`app/api/auth/[...nextauth]/route.ts`)
**Test File:** `app/api/auth/[...nextauth]/__tests__/route.test.ts`

#### **Configuration**
- [ ] authOptions exports correctly
- [ ] Google provider configured with env vars
- [ ] Credentials provider configured
- [ ] Session strategy is JWT
- [ ] Session maxAge is 30 days
- [ ] JWT maxAge is 30 days
- [ ] Pages configuration correct
- [ ] Secret is from env var

#### **Google OAuth Provider**
- [ ] Uses GOOGLE_CLIENT_ID from env
- [ ] Uses GOOGLE_CLIENT_SECRET from env
- [ ] Authorization params include consent prompt
- [ ] Authorization params include offline access
- [ ] Response type is code

#### **Credentials Provider**
- [ ] Validates email format
- [ ] Validates password format
- [ ] Throws error for missing credentials
- [ ] Throws error for invalid email
- [ ] Throws error for invalid password
- [ ] Uses validateEmail utility
- [ ] Uses validatePassword utility
- [ ] TODO comments for DB integration

#### **JWT Callback**
- [ ] Adds user ID to token
- [ ] Adds access token for OAuth
- [ ] Returns modified token

#### **Session Callback**
- [ ] Adds user ID to session
- [ ] Returns modified session

#### **Redirect Callback**
- [ ] Allows relative URLs
- [ ] Allows same-origin URLs
- [ ] Blocks external redirects
- [ ] Returns baseUrl for invalid redirects

#### **Events**
- [ ] signIn event logs user email
- [ ] signOut event logs
- [ ] createUser event logs user email

#### **Security**
- [ ] Debug only in development
- [ ] Secret is required in production

**Priority:** CRITICAL (authentication)
**Estimated Tests:** 25-30 test cases

---

## 5. App Routes Testing

### 5.1 Main Page (`app/page.tsx`)
**Test File:** `app/__tests__/page.test.tsx`

- [ ] Renders all marketing sections
- [ ] Hero section renders
- [ ] HowItWorks section renders
- [ ] InteractiveDemo section renders
- [ ] SecurityFeatures section renders
- [ ] Pricing section renders
- [ ] Testimonials section renders
- [ ] FAQ section renders
- [ ] FinalCTA section renders
- [ ] Sections render in correct order
- [ ] Page is accessible
- [ ] Meta tags present

**Priority:** HIGH (main landing page)
**Estimated Tests:** 12 test cases

---

### 5.2 Layout (`app/layout.tsx`)
**Test File:** `app/__tests__/layout.test.tsx`

- [ ] Renders children correctly
- [ ] Includes HTML lang attribute
- [ ] Font configuration applied
- [ ] Metadata exported correctly
- [ ] Header component renders
- [ ] Footer component renders
- [ ] Providers wrap children (if any)

**Priority:** HIGH
**Estimated Tests:** 7 test cases

---

### 5.3 Error Page (`app/error.tsx`)
**Test File:** `app/__tests__/error.test.tsx`

- [ ] Renders error message
- [ ] Displays error details in development
- [ ] Hides error details in production
- [ ] Reset button calls reset function
- [ ] Logs error to console/Sentry
- [ ] User-friendly message shown

**Priority:** MEDIUM
**Estimated Tests:** 6 test cases

---

### 5.4 Global Error Page (`app/global-error.tsx`)
**Test File:** `app/__tests__/global-error.test.tsx`

- [ ] Renders when error boundary catches error
- [ ] Includes HTML structure
- [ ] Shows fallback UI
- [ ] Logs error
- [ ] Reset functionality works

**Priority:** MEDIUM
**Estimated Tests:** 5 test cases

---

### 5.5 Sitemap (`app/sitemap.ts`)
**Test File:** `app/__tests__/sitemap.test.ts`

- [ ] Returns array of URLs
- [ ] Includes homepage
- [ ] Includes all public pages
- [ ] URLs use correct protocol (https)
- [ ] lastModified dates present
- [ ] changeFrequency present
- [ ] priority values appropriate

**Priority:** LOW (SEO)
**Estimated Tests:** 7 test cases

---

### 5.6 Robots.txt (`app/robots.ts`)
**Test File:** `app/__tests__/robots.test.ts`

- [ ] Returns robots rules
- [ ] Allows all user agents
- [ ] Disallows admin routes
- [ ] Disallows API routes
- [ ] Includes sitemap URL

**Priority:** LOW (SEO)
**Estimated Tests:** 5 test cases

---

## 6. Configuration Testing

### 6.1 Next.js Config (`next.config.ts`)
**Test File:** `__tests__/next.config.test.ts`

- [ ] Security headers present
- [ ] Content-Security-Policy header configured
- [ ] X-Frame-Options set to DENY
- [ ] X-Content-Type-Options set to nosniff
- [ ] Referrer-Policy configured
- [ ] HSTS configured (Strict-Transport-Security)
- [ ] Headers apply to all routes

**Priority:** HIGH (security)
**Estimated Tests:** 7 test cases

---

## 7. Integration Tests

### 7.1 User Flows
**Test File:** `__tests__/integration/user-flows.test.tsx`

- [ ] Complete signup flow
- [ ] Complete login flow
- [ ] Complete logout flow
- [ ] Password reset flow
- [ ] OAuth login flow (Google)
- [ ] Navigate through marketing pages
- [ ] Interact with pricing toggle
- [ ] Expand FAQ items
- [ ] Submit contact form (when implemented)
- [ ] File upload simulation

**Priority:** HIGH
**Estimated Tests:** 10 test cases

---

### 7.2 Security Integration
**Test File:** `__tests__/integration/security.test.tsx`

- [ ] Rate limiting blocks excessive requests
- [ ] Rate limiting allows requests under limit
- [ ] CSRF token validation works
- [ ] XSS attempts are blocked
- [ ] SQL injection attempts are blocked
- [ ] File upload rejects invalid files
- [ ] Authentication protects routes
- [ ] Session expires after 30 days

**Priority:** CRITICAL
**Estimated Tests:** 8-10 test cases

---

## 8. End-to-End Tests (Playwright)

### 8.1 Critical User Journeys
**Test File:** `e2e/user-journeys.spec.ts`

- [ ] Homepage loads completely
- [ ] User can navigate to pricing
- [ ] User can toggle pricing monthly/annual
- [ ] User can scroll through all sections
- [ ] Mobile menu works on small screens
- [ ] All links are functional
- [ ] Forms are accessible
- [ ] Modal opens and closes
- [ ] Keyboard navigation works
- [ ] Screen reader announces content

**Priority:** HIGH
**Estimated Tests:** 10 test cases

---

### 8.2 Authentication E2E
**Test File:** `e2e/authentication.spec.ts`

- [ ] User can sign up with email
- [ ] User can log in with credentials
- [ ] User can log in with Google OAuth
- [ ] User sees error for wrong password
- [ ] User sees error for invalid email
- [ ] User is redirected after login
- [ ] User can log out
- [ ] Session persists on page reload

**Priority:** CRITICAL
**Estimated Tests:** 8 test cases

---

### 8.3 Accessibility E2E
**Test File:** `e2e/accessibility.spec.ts`

- [ ] No WCAG 2.1 AA violations on homepage
- [ ] No WCAG 2.1 AA violations on pricing page
- [ ] Focus indicators visible
- [ ] Skip to main content link works
- [ ] All images have alt text
- [ ] Form labels associated correctly
- [ ] Color contrast meets standards
- [ ] Landmarks are present (header, main, footer)

**Priority:** HIGH
**Estimated Tests:** 8 test cases

---

### 8.4 Performance E2E
**Test File:** `e2e/performance.spec.ts`

- [ ] Homepage LCP < 2.5s
- [ ] Homepage FID < 100ms
- [ ] Homepage CLS < 0.1
- [ ] Time to Interactive < 3.8s
- [ ] Images are lazy-loaded
- [ ] No layout shifts on load
- [ ] Bundle size is reasonable

**Priority:** MEDIUM
**Estimated Tests:** 7 test cases

---

## 9. Visual Regression Tests

### **Component Snapshots**
**Test Files:** Throughout component test files

- [ ] Button variants snapshot
- [ ] Input states snapshot
- [ ] Modal snapshot
- [ ] Card snapshot
- [ ] Accordion states snapshot
- [ ] Toast types snapshot
- [ ] Hero section snapshot
- [ ] Pricing section snapshot (monthly/annual)
- [ ] Footer snapshot
- [ ] Header snapshot

**Priority:** MEDIUM
**Estimated Tests:** 20-30 snapshots

---

## 10. Error Handling & Edge Cases

### 10.1 Error Boundary Tests
**Test File:** `__tests__/error-boundaries.test.tsx`

- [ ] Error boundary catches component errors
- [ ] Error boundary shows fallback UI
- [ ] Error logs to Sentry
- [ ] User can recover from errors
- [ ] Different error types handled

**Priority:** HIGH
**Estimated Tests:** 5 test cases

---

### 10.2 Network Failure Tests
**Test File:** `__tests__/network-failures.test.tsx`

- [ ] API call failures show error message
- [ ] Retry mechanism works
- [ ] Offline mode detected
- [ ] Form submission failures handled gracefully
- [ ] Authentication failures show appropriate errors

**Priority:** MEDIUM
**Estimated Tests:** 5 test cases

---

## 11. Mock Data & Test Utilities

### 11.1 Mock Factories
**File:** `__tests__/factories/index.ts`

- [ ] createMockUser() factory
- [ ] createMockSession() factory
- [ ] createMockTransaction() factory
- [ ] createMockPricingPlan() factory
- [ ] createMockTestimonial() factory

### 11.2 Test Utilities
**File:** `__tests__/test-utils.tsx`

- [ ] Custom render with providers
- [ ] Mock router utility
- [ ] Mock IntersectionObserver
- [ ] Mock fetch/API calls
- [ ] Wait utilities for async tests

---

## Coverage Goals

### Minimum Coverage Targets
- **Overall Coverage:** 90%
- **Critical paths (auth, security):** 100%
- **UI Components:** 85%
- **Utilities/Hooks:** 95%
- **API Routes:** 90%
- **Integration Tests:** Cover all major flows

### Coverage Reports
```bash
npm run test:coverage
```

**Reports should show:**
- Statement coverage
- Branch coverage
- Function coverage
- Line coverage

---

## Test Execution

### Commands
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run E2E tests in UI mode
npm run test:e2e:ui

# Run specific test file
npm test -- Button.test.tsx

# Run tests matching pattern
npm test -- --testPathPattern=security
```

---

## Continuous Integration

### CI Pipeline Requirements
- [ ] All tests run on PR
- [ ] Coverage report generated
- [ ] E2E tests run on staging
- [ ] Visual regression tests
- [ ] Accessibility tests
- [ ] Performance budgets enforced
- [ ] Security scan (npm audit)
- [ ] Lint checks pass
- [ ] Type checks pass
- [ ] Build succeeds

---

## Summary

### Total Estimated Test Cases
- **UI Components:** ~150-180 tests
- **Hooks:** ~10-12 tests
- **Security Utilities:** ~100-110 tests
- **API Routes:** ~30-35 tests
- **App Routes:** ~45-50 tests
- **Integration Tests:** ~20-25 tests
- **E2E Tests:** ~35-40 tests
- **Visual Regression:** ~25-30 snapshots

**Grand Total: ~415-480 test cases**

### Priority Breakdown
- **CRITICAL:** ~155 tests (security, auth, rate limiting)
- **HIGH:** ~150 tests (core components, main flows)
- **MEDIUM:** ~80 tests (secondary features)
- **LOW:** ~50 tests (non-critical UI)

### Estimated Time Investment
- **Setup testing infrastructure:** 4-6 hours
- **Write unit tests:** 20-30 hours
- **Write integration tests:** 8-10 hours
- **Write E2E tests:** 10-12 hours
- **Visual regression setup:** 3-4 hours
- **CI/CD integration:** 3-4 hours

**Total: 48-66 hours** for complete test coverage

---

## Next Steps

1. Set up testing infrastructure (Jest/Vitest + Testing Library + Playwright)
2. Write tests for critical security utilities first
3. Add tests for core UI components
4. Implement integration tests
5. Add E2E tests
6. Set up CI pipeline
7. Achieve 90%+ coverage
8. Maintain tests with new features
