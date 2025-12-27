---
title: Troubleshooting Upload Errors
description: Solutions to common upload and processing issues
order: 4
---

# Troubleshooting Upload Errors

## Common Issues & Solutions

### "File Format Not Recognized"

**Problem:** We can't read your CSV

**Check:**
- [ ] File ends in `.csv` (not `.xlsx`, `.xls`, `.txt`)
- [ ] File is actually CSV when opened in text editor
- [ ] No special formatting or colors from Excel
- [ ] Encoding is UTF-8

**Fix:**
```
1. Open file in text editor (not Excel)
2. Check it shows comma-separated values
3. Save as UTF-8 if needed
4. Try uploading again
```

### "No Transactions Found"

**Problem:** Your CSV has data but we found 0 transactions

**Check:**
- [ ] Headers exist in first row (Date, Pair, Type, etc.)
- [ ] Data starts in row 2 (not row 3 or later)
- [ ] No blank rows above data
- [ ] All required columns present

**Fix:**
```
1. Delete any blank rows at top
2. Verify headers: Date, Pair/Symbol, Type, Amount
3. Check that data rows start immediately after headers
4. Remove any summary rows at bottom
5. Upload again
```

### "File Too Large"

**Problem:** File exceeds 50MB or 100K rows

**Solution:**
- Split file by year: `2024_trades.csv`, `2025_trades.csv`
- Or by quarter: `Q1_2025.csv`, `Q2_2025.csv`
- Upload in multiple batches
- Contact support for enterprise processing

### "Unrecognized Exchange Format"

**Problem:** We detected your exchange but CSV structure is unusual

**Try:**
- Export again from exchange with default settings
- Check exchange's export options (sometimes there are variants)
- Ensure no custom formatting applied
- Email CSV to support@taxformatter.com

**We can often add custom support quickly!**

### "Special Characters Causing Issues"

**Problem:** Non-English characters breaking the parser

**Fix:**
1. Open CSV in text editor
2. File → Save As
3. Select **UTF-8** encoding
4. Save
5. Upload again

### "Duplicate Transactions Detected"

**Problem:** Same trade appears multiple times

**Causes:**
- Exported overlapping date ranges
- Downloaded multiple times from exchange
- Exchange lists same trade in multiple formats

**Fix:**
- Remove duplicate rows manually
- Use date range in export to avoid overlap
- Contact support if uncertain

### "Timestamp Mismatches"

**Problem:** Dates not parsing correctly

**Solutions:**
- Check date format (MM/DD/YYYY vs DD/MM/YYYY)
- Remove time if only date needed
- Standardize all dates to same format
- Use YYYY-MM-DD for clarity

### "Missing Required Columns"

**Problem:** Exchange export missing essential data

**Required:**
- Date (when trade happened)
- Pair/Symbol (what asset)
- Type (BUY/SELL/etc)
- Amount (quantity)

**If missing from export:**
- Check exchange export options
- Try "detailed export" or "full report"
- Contact exchange support
- Email us for potential workaround

### "File Encoding Issues"

**Problem:** Special characters appear as ???  or garbled text

**Fix:**
1. Open CSV in text editor
2. Select all (Ctrl+A)
3. Copy
4. Create new file
5. Paste
6. Save as UTF-8
7. Upload

---

## Advanced Troubleshooting

### Check Your CSV Structure

Open in text editor and verify format:

```
✅ Good:
Date,Pair,Type,Amount
2025-01-15,BTC/USD,BUY,0.5

❌ Bad:
Date | Pair | Type | Amount
2025-01-15 | BTC/USD | BUY | 0.5
```

(We need commas, not pipes)

### Validate CSV Online

Use a CSV validator before uploading:
- https://csvlint.io
- https://www.convertcsv.com/csv-viewer-editor.htm

### Test with Sample Data

Create a small test CSV with just 5 rows before uploading your full file.

---

## Still Having Issues?

**Contact Support:**
- Email: support@taxformatter.com
- Include: exchange name, file sample (anonymized)
- We respond within 24 hours

**We can often add custom exchange support or troubleshoot specific issues!**