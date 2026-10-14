/**
 * The bank-statement allowance as the code enforces it, for the copy that
 * states it. Mirrors lib/rate-limit.ts (fileUploadAnon / fileUpload);
 * __tests__/components/BankStatementLandingPage.test.tsx fails if the two
 * drift, so the bank page stays literally true. Pure so client pages can
 * import it.
 */
export const STATEMENTS_PER_HOUR_ANON = 3;
export const STATEMENTS_PER_HOUR_ACCOUNT = 10;
