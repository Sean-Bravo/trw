# Bank Statement PDF → Accounting Software Formatter

## Overview

A PDF-to-CSV converter that transforms bank statements into formats compatible with QuickBooks Online (QBO) and Xero. **No AI required** - pure deterministic parsing and extraction.

## Access Tiers

| Tier | Banks Supported | Features |
|------|-----------------|----------|
| **Free** | None | Crypto CSV only |
| **Pro** | Big 4 (Chase, BofA, Wells Fargo, Citi) | PDF → Excel/CSV |
| **Premium** | All 50+ banks + request new formats | Priority support |

## Architecture

### Hybrid Approach (Recommended)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PDF Processing Pipeline                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  1. User uploads PDF → S3 (presigned URL)                                    │
│                           ↓                                                   │
│  2. Scanner Lambda validates:                                                 │
│      - File type (PDF)                                                        │
│      - Size < 10MB                                                            │
│      - Not encrypted/password-protected                                       │
│                           ↓                                                   │
│  3. Processor Lambda:                                                         │
│      a. Check page count                                                      │
│         - ≤5 pages → pdfplumber (sync, fast)                                 │
│         - >5 pages → AWS Textract (async, scalable)                          │
│                           ↓                                                   │
│      b. Bank fingerprinting (detect bank from header/logo)                   │
│                           ↓                                                   │
│      c. Load bank-specific config (YAML)                                     │
│                           ↓                                                   │
│      d. Extract transactions using config rules                               │
│                           ↓                                                   │
│      e. Normalize & validate data                                            │
│                           ↓                                                   │
│      f. Duplicate detection (same date + amount + description)               │
│                           ↓                                                   │
│      g. Export to QBO/Xero format                                            │
│                           ↓                                                   │
│  4. Result → S3                                                               │
│                           ↓                                                   │
│  5. User downloads from dashboard                                             │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Why Hybrid?

| Method | Pros | Cons | Best For |
|--------|------|------|----------|
| pdfplumber | Free, fast, no AWS cost | Struggles with scanned PDFs | Digital statements (1-5 pages) |
| AWS Textract | OCR for scans, handles complex layouts | $1.50/1000 pages, async for >5 pages | Large statements, scanned documents |

**Decision Logic:**
```python
def choose_extraction_method(pdf_path: str) -> str:
    """Select extraction method based on PDF characteristics."""
    page_count = get_page_count(pdf_path)

    if page_count <= 5:
        # Try pdfplumber first (free, fast)
        text = extract_with_pdfplumber(pdf_path)
        if is_valid_extraction(text):
            return "pdfplumber"

    # Fall back to Textract for:
    # - Large PDFs (>5 pages)
    # - Scanned/image PDFs
    # - pdfplumber extraction failures
    return "textract"
```

### Textract Async for Large PDFs (>5 pages)

For PDFs with more than 5 pages, use Textract's async API to avoid Lambda timeout:

```python
import boto3

textract = boto3.client('textract')

def process_large_pdf(bucket: str, key: str, job_id: str) -> str:
    """
    Start async Textract job for large PDFs.
    Returns Textract job ID for polling.
    """
    response = textract.start_document_analysis(
        DocumentLocation={
            'S3Object': {
                'Bucket': bucket,
                'Name': key
            }
        },
        FeatureTypes=['TABLES', 'FORMS'],
        NotificationChannel={
            'SNSTopicArn': os.environ['TEXTRACT_SNS_TOPIC'],
            'RoleArn': os.environ['TEXTRACT_SNS_ROLE']
        },
        ClientRequestToken=job_id  # For idempotency
    )

    return response['JobId']

def check_textract_status(textract_job_id: str) -> dict:
    """Poll Textract job status."""
    response = textract.get_document_analysis(JobId=textract_job_id)
    return {
        'status': response['JobStatus'],  # IN_PROGRESS, SUCCEEDED, FAILED
        'blocks': response.get('Blocks', [])
    }
```

**Workflow for large PDFs:**
1. User uploads PDF
2. Scanner detects >5 pages
3. Start async Textract job
4. Return job status "processing" to user
5. SNS notification triggers completion Lambda
6. Extract transactions from Textract results
7. Update job status to "completed"

## Bank Configuration System

### Directory Structure

```
backend/
├── services/
│   └── bank_statement/
│       ├── __init__.py
│       ├── extractor.py          # PDF extraction (pdfplumber + Textract)
│       ├── normalizer.py         # Date/amount normalization
│       ├── fingerprinter.py      # Bank detection
│       ├── exporter.py           # QBO/Xero output
│       └── duplicate_detector.py # Duplicate transaction detection
├── configs/
│   └── banks/
│       ├── chase.yaml            # v1.2.0
│       ├── bofa.yaml             # v1.0.0
│       ├── wells_fargo.yaml      # v1.1.0
│       ├── citi.yaml             # v1.0.0
│       ├── capital_one.yaml      # v1.0.0
│       ├── pnc.yaml              # v1.0.0
│       └── _generic.yaml         # v1.0.0 - Fallback parser
```

### Bank Config Schema (with Versioning)

```yaml
# configs/banks/chase.yaml
bank:
  name: "Chase"
  aliases: ["JPMorgan Chase", "JPMC"]
  version: "1.2.0"  # Semantic versioning for config updates
  updated_at: "2026-01-10"

fingerprint:
  logo_patterns: ["JPMorgan", "CHASE"]
  header_patterns: ["Account Number", "Statement Period"]

table_detection:
  header_row_keywords: ["Date", "Description", "Amount", "Balance"]
  skip_rows_containing: ["Opening Balance", "Closing Balance", "Page"]

columns:
  date:
    names: ["Date", "Transaction Date", "Post Date"]
    format: "MM/DD/YYYY"
  description:
    names: ["Description", "Transaction Description"]
    max_length: 255
    multiline: true  # Append non-date lines to previous row
  amount:
    names: ["Amount", "Debit", "Credit"]
    # If separate Debit/Credit columns, combine with sign logic
    debit_credit_mode: true
  balance:
    names: ["Balance", "Running Balance"]

normalization:
  date_output: "YYYY-MM-DD"
  amount_sign: "negative_for_debits"  # QBO convention

validation:
  # Rules to catch extraction errors
  balance_reconciliation: true  # Verify running balance
  date_sequence: true           # Dates should be chronological
```

### Config Versioning Strategy

Each bank config includes:
- `version`: Semantic version (major.minor.patch)
- `updated_at`: Last modification date

**Version bump rules:**
- **Patch (x.x.1)**: Fix typos, minor regex adjustments
- **Minor (x.1.0)**: New column mappings, additional patterns
- **Major (1.0.0)**: Breaking changes to extraction logic

**Database tracking:**
```sql
-- Track which config version was used for each job
ALTER TABLE jobs ADD COLUMN bank_config_version text;

-- Example: "chase:1.2.0"
UPDATE jobs SET bank_config_version = 'chase:1.2.0' WHERE id = 'xxx';
```

This allows:
1. Reproducibility - know exactly which config processed each statement
2. Debugging - identify if issues started after a config update
3. Rollback - reprocess with previous config version if needed

## Core Processing Logic

### 1. Bank Fingerprinting

```python
# backend/services/bank_statement/fingerprinter.py

import os
import yaml
from typing import Optional, Dict, List
import re

class BankFingerprinter:
    def __init__(self):
        self.configs = self._load_configs()

    def _load_configs(self) -> Dict[str, dict]:
        """Load all bank YAML configs."""
        configs = {}
        config_dir = os.path.join(os.path.dirname(__file__), '../../configs/banks')

        for filename in os.listdir(config_dir):
            if filename.endswith('.yaml') and not filename.startswith('_'):
                with open(os.path.join(config_dir, filename)) as f:
                    config = yaml.safe_load(f)
                    bank_name = config['bank']['name'].lower()
                    configs[bank_name] = config

        return configs

    def detect_bank(self, text: str, first_page_only: bool = True) -> Optional[Dict]:
        """
        Detect bank from PDF text content.

        Returns:
            Bank config dict if matched, None if unknown
        """
        text_lower = text.lower()

        for bank_name, config in self.configs.items():
            # Check logo patterns
            for pattern in config['fingerprint'].get('logo_patterns', []):
                if pattern.lower() in text_lower:
                    return config

            # Check header patterns (all must match)
            header_patterns = config['fingerprint'].get('header_patterns', [])
            if header_patterns and all(p.lower() in text_lower for p in header_patterns):
                return config

        # Return generic fallback config
        return self._get_generic_config()

    def _get_generic_config(self) -> Dict:
        """Load the generic fallback config."""
        generic_path = os.path.join(
            os.path.dirname(__file__),
            '../../configs/banks/_generic.yaml'
        )
        with open(generic_path) as f:
            return yaml.safe_load(f)
```

### 2. Transaction Extraction

```python
# backend/services/bank_statement/extractor.py

import pdfplumber
import re
from typing import List, Dict, Any
from datetime import datetime

class TransactionExtractor:
    def __init__(self, config: dict):
        self.config = config
        self.date_pattern = self._build_date_pattern()

    def _build_date_pattern(self) -> re.Pattern:
        """Build regex for date detection based on config."""
        date_format = self.config['columns']['date'].get('format', 'MM/DD/YYYY')

        patterns = {
            'MM/DD/YYYY': r'\d{1,2}/\d{1,2}/\d{4}',
            'DD/MM/YYYY': r'\d{1,2}/\d{1,2}/\d{4}',
            'YYYY-MM-DD': r'\d{4}-\d{1,2}-\d{1,2}',
        }

        return re.compile(patterns.get(date_format, r'\d{1,2}/\d{1,2}/\d{4}'))

    def extract_from_pdf(self, pdf_path: str) -> List[Dict[str, Any]]:
        """Extract transactions from PDF using pdfplumber."""
        transactions = []

        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                # Try table extraction first
                tables = page.extract_tables()
                if tables:
                    transactions.extend(self._process_tables(tables))
                else:
                    # Fall back to text extraction
                    text = page.extract_text()
                    if text:
                        transactions.extend(self._process_text(text))

        return transactions

    def _process_tables(self, tables: List) -> List[Dict]:
        """Process extracted tables into transactions."""
        transactions = []

        for table in tables:
            if not table or len(table) < 2:
                continue

            # Find header row
            header_row = self._find_header_row(table)
            if header_row is None:
                continue

            headers = [str(h).strip().lower() if h else '' for h in table[header_row]]
            col_map = self._map_columns(headers)

            # Process data rows
            for row in table[header_row + 1:]:
                if self._should_skip_row(row):
                    continue

                tx = self._extract_transaction(row, col_map)
                if tx:
                    transactions.append(tx)

        return transactions

    def _find_header_row(self, table: List) -> Optional[int]:
        """Find the row containing column headers."""
        keywords = self.config['table_detection']['header_row_keywords']

        for i, row in enumerate(table):
            row_text = ' '.join(str(cell) for cell in row if cell).lower()
            if any(kw.lower() in row_text for kw in keywords):
                return i

        return None

    def _map_columns(self, headers: List[str]) -> Dict[str, int]:
        """Map config column names to actual column indices."""
        col_map = {}

        for field, config in self.config['columns'].items():
            for name in config.get('names', []):
                for i, header in enumerate(headers):
                    if name.lower() in header:
                        col_map[field] = i
                        break
                if field in col_map:
                    break

        return col_map

    def _should_skip_row(self, row: List) -> bool:
        """Check if row should be skipped (e.g., subtotals)."""
        row_text = ' '.join(str(cell) for cell in row if cell)
        skip_patterns = self.config['table_detection'].get('skip_rows_containing', [])

        return any(pattern.lower() in row_text.lower() for pattern in skip_patterns)

    def _extract_transaction(self, row: List, col_map: Dict) -> Optional[Dict]:
        """Extract a single transaction from a row."""
        try:
            date_col = col_map.get('date')
            desc_col = col_map.get('description')
            amount_col = col_map.get('amount')

            if date_col is None or amount_col is None:
                return None

            date_raw = str(row[date_col]).strip() if row[date_col] else ''
            if not self.date_pattern.match(date_raw):
                return None

            return {
                'date': date_raw,
                'description': str(row[desc_col]).strip() if desc_col and row[desc_col] else '',
                'amount': self._parse_amount(row, col_map),
                'raw_row': row  # Keep for debugging
            }
        except (IndexError, TypeError):
            return None

    def _parse_amount(self, row: List, col_map: Dict) -> float:
        """Parse amount, handling debit/credit columns."""
        amount_col = col_map.get('amount')

        if self.config['columns']['amount'].get('debit_credit_mode'):
            # Separate debit/credit columns
            debit = self._clean_amount(row[col_map.get('debit', amount_col)])
            credit = self._clean_amount(row[col_map.get('credit', amount_col)])
            return credit - debit if credit else -debit
        else:
            return self._clean_amount(row[amount_col])

    def _clean_amount(self, value) -> float:
        """Clean and parse amount string."""
        if not value:
            return 0.0

        text = str(value).strip()
        # Remove currency symbols, commas, parentheses (negative)
        text = re.sub(r'[$,]', '', text)

        # Handle parentheses as negative
        if text.startswith('(') and text.endswith(')'):
            text = '-' + text[1:-1]

        try:
            return float(text)
        except ValueError:
            return 0.0
```

### 3. Multiline Description Handling

```python
def _process_text(self, text: str) -> List[Dict]:
    """
    Process raw text when tables aren't detected.
    Handles multiline descriptions.
    """
    lines = text.split('\n')
    transactions = []
    current_tx = None

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Check if line starts with a date
        date_match = self.date_pattern.match(line)

        if date_match:
            # Save previous transaction
            if current_tx:
                transactions.append(current_tx)

            # Start new transaction
            current_tx = self._parse_text_line(line, date_match)

        elif current_tx and self.config['columns']['description'].get('multiline'):
            # Append to previous transaction's description
            current_tx['description'] += ' ' + line

    # Don't forget last transaction
    if current_tx:
        transactions.append(current_tx)

    return transactions
```

### 4. Duplicate Detection

```python
# backend/services/bank_statement/duplicate_detector.py

from typing import List, Dict, Set
import hashlib

class DuplicateDetector:
    """Detect and handle duplicate transactions."""

    def __init__(self, tolerance: float = 0.01):
        self.tolerance = tolerance  # Amount tolerance for floating point

    def find_duplicates(self, transactions: List[Dict]) -> Dict[str, List[int]]:
        """
        Find duplicate transactions based on date + amount + description.

        Returns:
            Dict mapping fingerprint to list of duplicate indices
        """
        fingerprints: Dict[str, List[int]] = {}

        for i, tx in enumerate(transactions):
            fp = self._fingerprint(tx)
            if fp not in fingerprints:
                fingerprints[fp] = []
            fingerprints[fp].append(i)

        # Return only actual duplicates (more than one occurrence)
        return {fp: indices for fp, indices in fingerprints.items() if len(indices) > 1}

    def _fingerprint(self, tx: Dict) -> str:
        """Generate fingerprint for a transaction."""
        # Normalize components
        date = str(tx.get('date', '')).strip()
        amount = round(float(tx.get('amount', 0)), 2)
        description = str(tx.get('description', '')).lower().strip()[:50]  # First 50 chars

        # Create hash
        key = f"{date}|{amount}|{description}"
        return hashlib.md5(key.encode()).hexdigest()[:16]

    def deduplicate(
        self,
        transactions: List[Dict],
        strategy: str = 'keep_first'
    ) -> List[Dict]:
        """
        Remove duplicate transactions.

        Strategies:
        - 'keep_first': Keep first occurrence
        - 'keep_last': Keep last occurrence
        - 'mark_only': Don't remove, just mark duplicates
        """
        duplicates = self.find_duplicates(transactions)

        if not duplicates:
            return transactions

        indices_to_remove: Set[int] = set()

        for fp, indices in duplicates.items():
            if strategy == 'keep_first':
                indices_to_remove.update(indices[1:])  # Remove all but first
            elif strategy == 'keep_last':
                indices_to_remove.update(indices[:-1])  # Remove all but last
            elif strategy == 'mark_only':
                for idx in indices:
                    transactions[idx]['is_duplicate'] = True
                    transactions[idx]['duplicate_count'] = len(indices)

        if strategy == 'mark_only':
            return transactions

        return [tx for i, tx in enumerate(transactions) if i not in indices_to_remove]
```

### 5. Data Normalization

```python
# backend/services/bank_statement/normalizer.py

from datetime import datetime
from dateutil import parser as date_parser
from typing import Dict, List, Optional

class TransactionNormalizer:
    def __init__(self, config: dict):
        self.config = config
        self.date_output = config['normalization'].get('date_output', 'YYYY-MM-DD')
        self.amount_sign = config['normalization'].get('amount_sign', 'negative_for_debits')

    def normalize(self, transactions: List[Dict]) -> List[Dict]:
        """Normalize all transactions."""
        normalized = []

        for tx in transactions:
            try:
                normalized.append({
                    'date': self._normalize_date(tx.get('date', '')),
                    'description': self._clean_description(tx.get('description', '')),
                    'amount': self._normalize_amount(tx.get('amount', 0)),
                    'original': tx  # Keep original for debugging
                })
            except Exception as e:
                # Log but don't fail entire batch
                print(f"Normalization error: {e}")
                continue

        return normalized

    def _normalize_date(self, date_str: str) -> str:
        """Parse and reformat date."""
        try:
            parsed = date_parser.parse(date_str, fuzzy=True)

            format_map = {
                'YYYY-MM-DD': '%Y-%m-%d',
                'MM/DD/YYYY': '%m/%d/%Y',
                'DD/MM/YYYY': '%d/%m/%Y',
            }

            fmt = format_map.get(self.date_output, '%Y-%m-%d')
            return parsed.strftime(fmt)
        except Exception:
            return date_str  # Return original if parsing fails

    def _clean_description(self, desc: str) -> str:
        """Clean up description text."""
        # Remove excessive whitespace
        desc = ' '.join(desc.split())

        # Truncate if too long
        max_len = self.config['columns']['description'].get('max_length', 255)
        if len(desc) > max_len:
            desc = desc[:max_len - 3] + '...'

        return desc

    def _normalize_amount(self, amount: float) -> float:
        """Ensure consistent sign convention."""
        # QBO expects negative for expenses, positive for income
        # Most banks show debits as positive, credits as negative

        if self.amount_sign == 'negative_for_debits':
            # Already correct for QBO
            return round(amount, 2)
        elif self.amount_sign == 'positive_for_debits':
            # Flip the sign
            return round(-amount, 2)

        return round(amount, 2)
```

### 6. Export Formats

```python
# backend/services/bank_statement/exporter.py

import csv
from io import StringIO
from typing import List, Dict

class AccountingExporter:
    """Export transactions to accounting software formats."""

    def to_qbo(self, transactions: List[Dict]) -> str:
        """
        Export to QuickBooks Online CSV format.

        Columns: Date, Description, Amount
        - Negative amount = expense
        - Positive amount = income
        """
        output = StringIO()
        writer = csv.writer(output)

        # QBO header
        writer.writerow(['Date', 'Description', 'Amount'])

        for tx in transactions:
            writer.writerow([
                tx['date'],
                tx['description'],
                tx['amount']
            ])

        return output.getvalue()

    def to_xero(self, transactions: List[Dict]) -> str:
        """
        Export to Xero CSV format.

        Columns: *Date, *Amount, Payee, Description, Reference, Check Number
        (* = required)
        """
        output = StringIO()
        writer = csv.writer(output)

        # Xero header
        writer.writerow(['*Date', '*Amount', 'Payee', 'Description', 'Reference', 'Check Number'])

        for tx in transactions:
            # Extract payee from description (first part before common separators)
            payee = self._extract_payee(tx['description'])

            writer.writerow([
                tx['date'],
                tx['amount'],
                payee,
                tx['description'],
                '',  # Reference
                ''   # Check Number
            ])

        return output.getvalue()

    def _extract_payee(self, description: str) -> str:
        """Extract payee name from description."""
        # Common patterns: "VENMO PAYMENT TO John Doe", "ACH DEBIT NETFLIX"
        separators = [' TO ', ' FROM ', ' - ', ' ACH ', ' DEBIT ', ' CREDIT ']

        for sep in separators:
            if sep in description.upper():
                idx = description.upper().index(sep)
                return description[idx + len(sep):].split()[0:3]  # First 3 words

        # Default: first 3 words
        return ' '.join(description.split()[:3])
```

## Generic Fallback Parser

For unrecognized banks, provide a "best effort" parser with clear UX feedback:

### Config: `_generic.yaml`

```yaml
# configs/banks/_generic.yaml
bank:
  name: "Unknown Bank"
  version: "1.0.0"
  is_generic: true  # Flag for special UX handling

fingerprint:
  # Matches nothing - only used as fallback
  logo_patterns: []
  header_patterns: []

table_detection:
  # Generic patterns that work for most statements
  header_row_keywords: ["Date", "Transaction", "Description", "Amount", "Debit", "Credit", "Balance"]
  skip_rows_containing: ["Total", "Balance Forward", "Opening", "Closing", "Page", "Statement"]

columns:
  date:
    names: ["Date", "Trans Date", "Transaction Date", "Posted", "Post Date"]
    format: "MM/DD/YYYY"
  description:
    names: ["Description", "Transaction", "Details", "Memo", "Narrative"]
    max_length: 255
    multiline: true
  amount:
    names: ["Amount", "Debit", "Credit", "Value"]
    debit_credit_mode: true

normalization:
  date_output: "YYYY-MM-DD"
  amount_sign: "negative_for_debits"

validation:
  balance_reconciliation: false  # Can't verify without knowing format
  date_sequence: true
```

### UX for Unknown Banks

When generic parser is used:

```python
def process_with_fallback(pdf_path: str, config: dict) -> dict:
    """Process with generic parser and add warnings."""
    result = {
        'transactions': [],
        'warnings': [],
        'metadata': {}
    }

    if config.get('bank', {}).get('is_generic'):
        result['warnings'].append({
            'type': 'unknown_bank',
            'message': 'Bank not recognized. Using generic parser - please review results carefully.',
            'severity': 'warning'
        })
        result['metadata']['parser_type'] = 'generic'
        result['metadata']['review_recommended'] = True

    # ... extraction logic ...

    return result
```

**Frontend display:**
```tsx
{job.metadata?.parser_type === 'generic' && (
  <Alert variant="warning">
    <AlertTitle>Unknown Bank Format</AlertTitle>
    <AlertDescription>
      We couldn't identify your bank's format. Results have been extracted
      using our generic parser. Please review the output carefully before
      importing into your accounting software.
    </AlertDescription>
  </Alert>
)}
```

## Dashboard Integration

### UI Placement

Main dashboard with toggle between Crypto and Bank modes:

```tsx
// components/dashboard/FileUploader.tsx

const [mode, setMode] = useState<'crypto' | 'bank'>('crypto');

return (
  <div>
    {/* Mode Toggle */}
    <div className="flex gap-2 mb-6">
      <button
        onClick={() => setMode('crypto')}
        className={`px-4 py-2 rounded-lg ${
          mode === 'crypto'
            ? 'bg-indigo-600 text-white'
            : 'bg-slate-800 text-slate-400'
        }`}
      >
        Crypto CSV
      </button>
      <button
        onClick={() => setMode('bank')}
        className={`px-4 py-2 rounded-lg ${
          mode === 'bank'
            ? 'bg-emerald-600 text-white'
            : 'bg-slate-800 text-slate-400'
        }`}
      >
        Bank PDF
      </button>
    </div>

    {/* File Upload Zone */}
    {mode === 'crypto' ? (
      <CryptoCSVUploader />
    ) : (
      <BankPDFUploader />
    )}
  </div>
);
```

### BankPDFUploader Component

```tsx
// components/dashboard/BankPDFUploader.tsx

export function BankPDFUploader() {
  const { tier } = useSubscription();

  if (tier === 'free') {
    return (
      <Card className="p-6 text-center">
        <Lock className="w-12 h-12 mx-auto mb-4 text-slate-500" />
        <h3 className="text-lg font-semibold mb-2">Bank PDF Conversion</h3>
        <p className="text-slate-400 mb-4">
          Convert bank statements to QBO/Xero format.
          Available on Pro and Premium plans.
        </p>
        <Link href="/pricing">
          <Button variant="primary">Upgrade to Pro</Button>
        </Link>
      </Card>
    );
  }

  return (
    <DropZone
      accept={{ 'application/pdf': ['.pdf'] }}
      maxSize={10 * 1024 * 1024}  // 10MB
      onDrop={handlePDFUpload}
    >
      <div className="text-center py-12">
        <FileUp className="w-12 h-12 mx-auto mb-4 text-emerald-400" />
        <p className="text-lg">Drop your bank statement PDF here</p>
        <p className="text-sm text-slate-400 mt-2">
          Supported: Chase, Bank of America, Wells Fargo, Citi
          {tier === 'premium' && ', + 46 more banks'}
        </p>
      </div>
    </DropZone>
  );
}
```

## API Endpoints

### New Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/bank/upload` | Get presigned URL for PDF upload |
| POST | `/api/bank/process` | Start processing job |
| GET | `/api/bank/job/{id}` | Get job status |
| GET | `/api/bank/job/{id}/download` | Download result CSV |
| GET | `/api/bank/banks` | List supported banks for user tier |

### Lambda Handler Updates

```python
# backend/handlers/webhook.py - Add bank statement routes

def handle_bank_request(event: dict, path: str, method: str) -> dict:
    """Handle bank statement API requests."""

    if path == '/bank/upload' and method == 'POST':
        return handle_bank_upload(event)

    if path == '/bank/process' and method == 'POST':
        return handle_bank_process(event)

    if path.startswith('/bank/job/') and method == 'GET':
        job_id = path.split('/')[-1]
        if path.endswith('/download'):
            return handle_bank_download(job_id, event)
        return handle_bank_status(job_id, event)

    if path == '/bank/banks' and method == 'GET':
        return handle_list_banks(event)

    return {'statusCode': 404, 'body': json.dumps({'error': 'Not found'})}
```

## Database Updates

```sql
-- Add bank statement support to existing tables

-- Track bank statement jobs separately
ALTER TABLE jobs ADD COLUMN job_type text DEFAULT 'crypto';
-- Values: 'crypto', 'bank'

-- Track detected bank
ALTER TABLE jobs ADD COLUMN detected_bank text;

-- Track config version used
ALTER TABLE jobs ADD COLUMN config_version text;

-- Index for filtering
CREATE INDEX idx_jobs_type ON jobs(job_type);
```

## Terraform Updates

```hcl
# backend/terraform/s3.tf - Add bank statement bucket

resource "aws_s3_bucket" "bank_uploads" {
  bucket = "taxformatter-bank-uploads-${var.environment}"
}

resource "aws_s3_bucket_lifecycle_configuration" "bank_uploads_lifecycle" {
  bucket = aws_s3_bucket.bank_uploads.id

  rule {
    id     = "delete-old-uploads"
    status = "Enabled"

    expiration {
      days = 1  # Delete PDFs after 24 hours
    }
  }
}
```

## Testing Plan

### Unit Tests
- [ ] `test_fingerprinter.py` - Bank detection accuracy
- [ ] `test_extractor.py` - PDF extraction (pdfplumber + Textract mock)
- [ ] `test_normalizer.py` - Date/amount normalization
- [ ] `test_exporter.py` - QBO/Xero format compliance
- [ ] `test_duplicate_detector.py` - Duplicate detection and deduplication

### Integration Tests
- [ ] Upload PDF → Process → Download CSV
- [ ] Big 4 bank real statement samples
- [ ] Generic fallback with unknown bank

### Sample Test Files
```
tests/fixtures/bank_statements/
├── chase_checking_3pages.pdf
├── bofa_savings_1page.pdf
├── wells_fargo_credit_5pages.pdf
├── citi_checking_10pages.pdf      # Tests async Textract
├── unknown_bank_statement.pdf     # Tests generic fallback
└── scanned_statement.pdf          # Tests OCR path
```

## Rollout Plan

### Phase 1: Infrastructure (Day 1 AM)
- [ ] Add bank statement bucket to Terraform
- [ ] Create bank config YAML files (Big 4)
- [ ] Add `bank_statement/` service module

### Phase 2: Core Processing (Day 1 PM)
- [ ] Implement fingerprinter
- [ ] Implement extractor (pdfplumber)
- [ ] Implement normalizer
- [ ] Implement exporter (QBO/Xero)
- [ ] Implement duplicate detector

### Phase 3: Lambda Integration (Day 2 AM)
- [ ] Add bank routes to webhook Lambda
- [ ] Update processor Lambda for bank PDFs
- [ ] Add Textract async support for large PDFs
- [ ] Deploy and test

### Phase 4: Frontend (Day 2 PM)
- [ ] Add mode toggle to dashboard
- [ ] Create BankPDFUploader component
- [ ] Add bank result display
- [ ] Add unknown bank warning UI

### Phase 5: Testing (Day 3)
- [ ] Unit tests
- [ ] Integration tests with real PDFs
- [ ] End-to-end user flow testing
- [ ] Performance testing (large PDFs)

## Cost Projections

| Component | Cost | Notes |
|-----------|------|-------|
| pdfplumber | $0 | Open source |
| AWS Textract | ~$1.50/1000 pages | Only for OCR/large PDFs |
| S3 Storage | ~$0.023/GB | PDFs deleted after 24h |
| Lambda | Included | Existing processor |

**Estimated monthly cost** (1000 bank statements, avg 3 pages):
- 70% pdfplumber path: $0
- 30% Textract path: ~$1.35
- **Total: ~$1.35/month** for processing

## Summary

This plan provides:
1. **Hybrid extraction** - pdfplumber for speed, Textract for reliability
2. **Async support** - Large PDFs don't timeout
3. **Config versioning** - Track which config processed each statement
4. **Generic fallback** - Handle unknown banks with clear user warnings
5. **Duplicate detection** - Prevent double-importing transactions
6. **Seamless UI** - Toggle between crypto and bank in same dashboard
7. **Tier gating** - Pro = Big 4, Premium = All banks
