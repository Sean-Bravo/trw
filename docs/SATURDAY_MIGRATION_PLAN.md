# Saturday Migration Plan

## Overview

Migrate TaxReadyWallet Python backend into TRW and convert fingerprinting.py from Supabase to Neon.

---

## Task 1: Move TaxReadyWallet Backend → TRW

### Files to Migrate

```
taxreadywallet/
├── services/
│   ├── engine.py              # Core CSV processing (2,973 lines)
│   └── fingerprinting.py      # Exchange format detection
├── lambda/
│   ├── processor.py           # Main Lambda handler
│   ├── virus_scanner.py       # ClamAV integration
│   └── requirements.txt
├── terraform/
│   └── *.tf                   # AWS infrastructure
└── tests/
    └── *.py                   # pytest suite
```

### Target Structure in TRW

```
trw/backend/
├── services/
│   ├── engine.py
│   └── fingerprinting.py
├── lambda/
│   ├── processor.py
│   ├── virus_scanner.py
│   └── requirements.txt
├── terraform/
│   └── *.tf
└── tests/
    └── *.py
```

### Steps

1. Copy files from taxreadywallet repo to `trw/backend/`
2. Update import paths if needed
3. Verify Python dependencies in requirements.txt
4. Run pytest to ensure nothing broke

---

## Task 2: Migrate fingerprinting.py from Supabase → Neon

### Current State

- fingerprinting.py uses Supabase client for caching exchange fingerprints
- Need to replace with Neon PostgreSQL connection

### Database Changes

Check if `ai_cache` table in `db/schema.sql` covers fingerprinting needs, or create:

```sql
-- If needed, add fingerprint cache table
CREATE TABLE IF NOT EXISTS fingerprint_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_hash VARCHAR(64) NOT NULL UNIQUE,
  exchange VARCHAR(50) NOT NULL,
  confidence DECIMAL(5,4) NOT NULL,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX idx_fingerprint_hash ON fingerprint_cache(file_hash);
```

### Code Changes

Replace Supabase client:

```python
# OLD (Supabase)
from supabase import create_client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
result = supabase.table('fingerprints').select('*').eq('hash', file_hash).execute()

# NEW (Neon/psycopg2)
import psycopg2
from os import environ

def get_db_connection():
    return psycopg2.connect(environ['NEON_DATABASE_URL'])

def get_cached_fingerprint(file_hash: str):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT exchange, confidence FROM fingerprint_cache WHERE file_hash = %s",
                (file_hash,)
            )
            return cur.fetchone()
```

### Steps

1. Review current fingerprinting.py Supabase usage
2. Create/verify fingerprint cache table in Neon
3. Replace Supabase client with psycopg2/Neon connection
4. Update Lambda environment variables (remove Supabase, add Neon)
5. Test fingerprint detection with sample CSVs

---

## Environment Variables to Update

### Remove (Supabase)
```
SUPABASE_URL=...
SUPABASE_KEY=...
```

### Keep/Add (Neon)
```
NEON_DATABASE_URL=postgresql://...
```

### Lambda Config
Update `terraform/lambda.tf` or AWS console with new env vars.

---

## Verification Checklist

- [ ] All Python files copied to `trw/backend/`
- [ ] Import paths updated
- [ ] fingerprinting.py uses Neon instead of Supabase
- [ ] Fingerprint cache table exists in Neon
- [ ] pytest passes locally
- [ ] Lambda can connect to Neon (test deployment optional)

---

## Notes

- Keep Supabase code commented out initially for rollback
- The 13 exchange parsers in engine.py should work without changes
- Fingerprinting is used for auto-detecting exchange format before parsing
