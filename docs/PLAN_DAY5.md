# Day 5 (Wednesday) - Edge Cases & Error Handling

## Overview
Test error handling, edge cases, and boundary conditions to ensure the app handles unexpected inputs gracefully.

---

## 1. Invalid File Types

### Non-CSV Files
- [ ] Upload .pdf file → Should reject with clear error
- [ ] Upload .docx file → Should reject with clear error
- [ ] Upload .xlsx file → Should reject with clear error
- [ ] Upload .txt file → Should reject or handle gracefully
- [ ] Upload image file (.png, .jpg) → Should reject

### Malformed CSV
- [ ] CSV with wrong delimiter (semicolon, tab)
- [ ] CSV with inconsistent column counts
- [ ] CSV with malformed quotes
- [ ] Binary file renamed to .csv

---

## 2. Empty & Minimal Files

### Empty CSV
- [ ] Upload completely empty file (0 bytes)
- [ ] Error message is clear and actionable

### Headers-Only CSV
- [ ] Upload CSV with headers but no data rows
- [ ] Should show appropriate message (no transactions found)

### Single Row CSV
- [ ] Upload CSV with headers + 1 data row
- [ ] Should process successfully

---

## 3. Large Files

### Size Limits
- [ ] Upload file at exactly 50MB limit
- [ ] Upload file slightly over 50MB → Should reject
- [ ] Error message shows size limit clearly

### Many Rows
- [ ] Upload CSV with 10,000+ transactions
- [ ] Progress indicator shows realistic progress
- [ ] Processing completes without timeout

---

## 4. Unknown Exchange Format

### Unrecognized Format
- [ ] Upload CSV that doesn't match any known exchange
- [ ] Should show exchange selector dropdown
- [ ] Manual selection triggers re-processing
- [ ] Can select "Other/Generic" option

### Ambiguous Format
- [ ] Upload CSV that could match multiple exchanges
- [ ] Should prompt for clarification or best-guess

---

## 5. Network Errors

### Upload Interruption
- [ ] Start upload, disconnect network midway
- [ ] Error message appears
- [ ] Can retry upload after reconnecting

### Processing Interruption
- [ ] File uploads, disconnect during processing
- [ ] Handles gracefully (timeout or error)
- [ ] Job shows failed state in history

### Download Interruption
- [ ] Start download, disconnect midway
- [ ] Browser handles partial download appropriately

---

## 6. Data Edge Cases

### Special Characters in Amounts
- [ ] Amounts with currency symbols ($100.00)
- [ ] Amounts with commas (1,000.00)
- [ ] Amounts with spaces
- [ ] Scientific notation (1e-8)

### Negative Numbers
- [ ] Negative quantities (sells, withdrawals)
- [ ] Negative fees (rebates)
- [ ] Handles correctly in output

### Missing Columns
- [ ] CSV missing optional columns
- [ ] CSV missing required columns → Clear error
- [ ] Columns in different order

### Extra Columns
- [ ] CSV with additional unknown columns
- [ ] Should ignore extra columns gracefully

---

## 7. Date/Time Edge Cases

### Various Formats
- [ ] ISO 8601 (2024-01-15T10:30:00Z)
- [ ] US format (01/15/2024)
- [ ] European format (15/01/2024)
- [ ] Unix timestamp
- [ ] Millisecond timestamps

### Timezone Handling
- [ ] UTC timestamps
- [ ] Local timezone timestamps
- [ ] Mixed timezones in same file

### Invalid Dates
- [ ] Future dates (year 2030)
- [ ] Very old dates (year 1990)
- [ ] Invalid dates (Feb 30)

---

## 8. Session & Auth Edge Cases

### Session Expiry
- [ ] Leave page idle, return after session timeout
- [ ] Redirects to login appropriately
- [ ] Preserves intended destination after re-login

### Concurrent Sessions
- [ ] Login from two browsers
- [ ] Both sessions work correctly
- [ ] Logout from one doesn't affect other

### Token Refresh
- [ ] Long processing job spanning token refresh
- [ ] Download works after token refresh

---

## 9. UI Edge Cases

### Rapid Actions
- [ ] Double-click upload button
- [ ] Click download multiple times quickly
- [ ] Should not create duplicate jobs

### Browser Back/Forward
- [ ] Upload file, press back, press forward
- [ ] State is preserved or handled gracefully

### Page Refresh
- [ ] Refresh during upload → Shows appropriate state
- [ ] Refresh during processing → Can resume or shows status
- [ ] Refresh on results → Results still available

---

## 10. Remaining Day 4 Tests

### Actual Downloads
- [ ] Click "Download for TurboTax" → File downloads
- [ ] Click "Download for Koinly" → File downloads
- [ ] Click "Download for CoinLedger" → File downloads
- [ ] Click "Download for ZenLedger" → File downloads

### Re-download from History
- [ ] Click Download on old job → Works
- [ ] Click View on old job → Shows details

---

## Test Files

Located in `backend/tests/fixtures/`:

| File | Purpose |
|------|---------|
| `edge_cases/empty_file.csv` | Empty file test |
| `edge_cases/header_only.csv` | Headers only test |
| `edge_cases/single_row.csv` | Minimal data test |
| `edge_cases/large_file_coinbase.csv` | Large file test |
| `edge_cases/utf8_bom_coinbase.csv` | BOM handling |
| `edge_cases/semicolon_delimiter.csv` | Wrong delimiter |
| `edge_cases/tab_delimiter.csv` | Tab delimiter |
| `edge_cases/whitespace_headers.csv` | Whitespace in headers |
| `edge_cases/mixed_case_headers.csv` | Case sensitivity |
| `edge_cases/quoted_fields.csv` | Quote handling |
| `edge_cases/unicode_data.csv` | Unicode characters |
| `edge_cases/windows_line_endings.csv` | CRLF handling |
| `ambiguous/fake_coinbase.csv` | Ambiguous format |

---

## Priority Order

1. **Critical**: Invalid file rejection, empty file handling
2. **High**: Large files, network errors
3. **Medium**: Data edge cases, date formats
4. **Low**: UI edge cases, concurrent sessions

---

## Success Criteria

- [ ] All invalid files rejected with clear error messages
- [ ] Empty/minimal files handled gracefully
- [ ] Large files process without timeout
- [ ] Network errors don't crash the app
- [ ] Edge case data is processed or rejected clearly
- [ ] No silent failures - always user feedback
