# Backend Integration Plan: TaxReadyWallet

## 🏗️ Architecture Overview

### **Current State:**
- **Backend:** Python FastAPI (v2.1.1) running on port 8000
- **Frontend:** Next.js 16 (trw repo) - Marketing site only
- **Database:** Supabase (PostgreSQL + JSONB)
- **Deployment:** DigitalOcean App Platform

### **What You Have:**

#### **Backend Repository** (`/Users/sean/Desktop/TaxReadyWallet/backend`)
```
backend/
├── main.py                    # FastAPI app (575 lines)
├── services/
│   ├── engine.py              # 13 exchange parsers (3,500+ lines)
│   ├── fingerprinting.py      # CSV format detection (600+ lines)
│   ├── storage.py             # Supabase operations (259 lines)
│   └── hasher.py              # Hash generation
├── routes/
│   └── exports.py             # Export endpoints
├── exporters.py               # 4 tax software exporters (400+ lines)
└── requirements.txt           # Python dependencies
```

#### **Frontend Repository** (`/Users/sean/.claude-worktrees/trw/mystifying-rhodes`)
```
Current: Marketing site only (no app functionality yet)
Need: Connect to backend API for CSV upload/export features
```

---

## 🎯 Integration Strategy

### **Option 1: Full Stack Next.js (RECOMMENDED)**
Keep Next.js frontend, add API routes that proxy to Python backend

**Pros:**
- Single deployment for frontend
- Can add Next.js API routes for simple operations
- Backend stays independent (can version separately)
- Best for SOC 2 compliance (separate services)

**Cons:**
- Need to proxy requests through Next.js → Python
- Two servers to manage

---

### **Option 2: Standalone Services**
Keep them completely separate

**Frontend:** `taxreadywallet.com` (Next.js on Vercel)
**Backend:** `api.taxreadywallet.com` (Python on DigitalOcean)

**Pros:**
- Clean separation of concerns
- Easy to scale independently
- Simplest CORS setup

**Cons:**
- Need subdomain setup
- CORS configuration required

---

## 🔧 Recommended Integration: Option 1 (Hybrid)

### **Why This Approach:**
1. ✅ Marketing site stays fast (static Next.js)
2. ✅ App functionality uses Python backend (proven, working)
3. ✅ Single domain (no CORS issues)
4. ✅ Easy local development
5. ✅ SOC 2 friendly (service isolation)

---

## 📋 Step-by-Step Integration Plan

### **Phase 1: Connect Frontend to Backend** (2-4 hours)

#### 1.1 Create API Client in Next.js
**File:** `lib/api-client.ts`

```typescript
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds for file uploads
});

// API Methods
export const api = {
  // Health check
  healthCheck: () => apiClient.get('/'),

  // Database health
  healthCheckDb: () => apiClient.get('/health/db'),

  // CSV Analysis
  analyzeFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/analyze-file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Preview mapping
  previewMapping: (file: File, mapping: object) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mapping', JSON.stringify(mapping));
    return apiClient.post('/preview-map', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Save mapping
  saveMapping: (fingerprint: string, mapping: object, exchange: string) => {
    const formData = new FormData();
    formData.append('fingerprint', fingerprint);
    formData.append('mapping', JSON.stringify(mapping));
    formData.append('exchange', exchange);
    return apiClient.post('/save-mapping', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Export
  exportTransactions: (format: string, transactions: any[]) => {
    return apiClient.post('/api/export/download', {
      format,
      transactions,
    }, {
      responseType: 'blob',
    });
  },

  // Analytics
  getConfigs: () => apiClient.get('/configs'),
};
```

#### 1.2 Environment Variables
**File:** `.env.local`

```bash
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8000

# Production
# NEXT_PUBLIC_API_URL=https://lobster-app-qrn5c.ondigitalocean.app
```

---

### **Phase 2: Build Upload Flow UI** (6-8 hours)

#### 2.1 Create Upload Page
**File:** `app/upload/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      const response = await api.analyzeFile(file);
      setResult(response.data);

      if (response.data.config_found) {
        // Instant recognition! Show preview
        console.log('Format recognized:', response.data.exchange);
      } else {
        // Need user to map columns
        console.log('Unknown format, showing mapping UI');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-12">
      <h1 className="text-4xl font-bold mb-8">Upload Transaction CSV</h1>

      <div className="space-y-6">
        {/* File Input */}
        <div>
          <Input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={uploading}
          />
        </div>

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={!file || uploading}
          isLoading={uploading}
        >
          {uploading ? 'Analyzing...' : 'Analyze CSV'}
        </Button>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
            <h2 className="text-xl font-bold mb-4">
              {result.config_found ? '✅ Format Recognized!' : '📝 Manual Mapping Required'}
            </h2>

            {result.config_found ? (
              <div>
                <p><strong>Exchange:</strong> {result.exchange}</p>
                <p><strong>Records:</strong> {result.total_records}</p>
                <p><strong>Source:</strong> {result.source}</p>

                {/* Show preview */}
                <div className="mt-4">
                  <h3 className="font-bold mb-2">Preview (first 5 rows):</h3>
                  <pre className="bg-white p-4 rounded overflow-auto">
                    {JSON.stringify(result.preview, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div>
                <p><strong>Headers found:</strong></p>
                <ul className="list-disc list-inside">
                  {result.headers?.map((h: string, i: number) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
                {/* TODO: Add column mapping UI */}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

#### 2.2 Create Mapping UI Component
**File:** `components/upload/ColumnMapper.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface ColumnMapperProps {
  headers: string[];
  onSave: (mapping: Record<string, string>, exchange: string) => void;
}

export function ColumnMapper({ headers, onSave }: ColumnMapperProps) {
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [exchange, setExchange] = useState('');

  const requiredFields = [
    { key: 'date', label: 'Date/Timestamp' },
    { key: 'type', label: 'Transaction Type' },
    { key: 'base_currency', label: 'Base Currency' },
    { key: 'quote_currency', label: 'Quote Currency' },
    { key: 'amount', label: 'Amount' },
    { key: 'price', label: 'Price (optional)' },
    { key: 'fee', label: 'Fee (optional)' },
  ];

  const exchanges = [
    'binance', 'coinbase', 'kraken', 'kucoin', 'bybit',
    'cashapp', 'robinhood', 'paypal', 'venmo', 'crypto.com',
    'gemini', 'ftx', 'bitfinex', 'okx', 'other'
  ];

  const handleSave = () => {
    if (!exchange) {
      alert('Please select an exchange');
      return;
    }
    onSave(mapping, exchange);
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block font-bold mb-2">Exchange:</label>
        <select
          className="w-full p-2 border rounded"
          value={exchange}
          onChange={(e) => setExchange(e.target.value)}
        >
          <option value="">Select exchange...</option>
          {exchanges.map(ex => (
            <option key={ex} value={ex}>{ex.toUpperCase()}</option>
          ))}
        </select>
      </div>

      <div>
        <h3 className="font-bold mb-4">Map Your CSV Columns:</h3>
        {requiredFields.map(field => (
          <div key={field.key} className="mb-4">
            <label className="block mb-1">{field.label}:</label>
            <select
              className="w-full p-2 border rounded"
              value={mapping[field.key] || ''}
              onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
            >
              <option value="">-- Select column --</option>
              {headers.map(header => (
                <option key={header} value={header}>{header}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <Button onClick={handleSave}>
        Save Mapping & Process
      </Button>
    </div>
  );
}
```

---

### **Phase 3: Export Functionality** (3-4 hours)

#### 3.1 Create Export Page
**File:** `app/export/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';

export default function ExportPage() {
  const [format, setFormat] = useState<string>('koinly');
  const [exporting, setExporting] = useState(false);

  // Assume transactions are stored in state/context after upload
  const transactions = []; // TODO: Get from upload flow

  const handleExport = async () => {
    setExporting(true);

    try {
      const response = await api.exportTransactions(format, transactions);

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      const extension = format === 'turbotax' ? 'ofx' : 'csv';
      link.setAttribute('download', `taxreadywallet_${format}.${extension}`);

      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  const exportFormats = [
    { value: 'koinly', label: 'Koinly (CSV)', description: 'Most popular crypto tax software' },
    { value: 'turbotax', label: 'TurboTax (OFX)', description: 'Intuit TurboTax format' },
    { value: 'coinledger', label: 'CoinLedger (CSV)', description: 'CoinLedger/CryptoTrader.Tax' },
    { value: 'zenledger', label: 'ZenLedger (CSV)', description: 'ZenLedger tax software' },
  ];

  return (
    <div className="container max-w-4xl mx-auto py-12">
      <h1 className="text-4xl font-bold mb-8">Export to Tax Software</h1>

      <div className="space-y-6">
        {/* Format Selection */}
        <div>
          <h2 className="text-xl font-bold mb-4">Choose Export Format:</h2>

          {exportFormats.map(fmt => (
            <div
              key={fmt.value}
              className={`p-4 mb-3 border rounded-lg cursor-pointer transition ${
                format === fmt.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setFormat(fmt.value)}
            >
              <div className="flex items-center">
                <input
                  type="radio"
                  checked={format === fmt.value}
                  onChange={() => setFormat(fmt.value)}
                  className="mr-3"
                />
                <div>
                  <div className="font-bold">{fmt.label}</div>
                  <div className="text-sm text-gray-600">{fmt.description}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Export Button */}
        <Button
          onClick={handleExport}
          disabled={!transactions.length || exporting}
          isLoading={exporting}
          variant="primary"
          size="lg"
        >
          {exporting ? 'Exporting...' : `Export ${transactions.length} Transactions`}
        </Button>
      </div>
    </div>
  );
}
```

---

### **Phase 4: Authentication Integration** (4-6 hours)

#### 4.1 Update NextAuth to Use Supabase

**File:** `app/api/auth/[...nextauth]/route.ts` (UPDATE)

```typescript
import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),

    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing credentials");
        }

        // Query Supabase for user
        const { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', credentials.email)
          .single();

        if (error || !user) {
          throw new Error("Invalid credentials");
        }

        // Verify password
        const isValid = await bcrypt.compare(credentials.password, user.password_hash);

        if (!isValid) {
          throw new Error("Invalid credentials");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      }
    })
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

#### 4.2 Create Supabase Tables

**Run in Supabase SQL Editor:**

```sql
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  password_hash VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions table (for tracking uploads)
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Uploads table (track user uploads)
CREATE TABLE IF NOT EXISTS uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  filename VARCHAR(500),
  fingerprint VARCHAR(64),
  exchange VARCHAR(100),
  record_count INT,
  status VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exchange configs table (already exists)
-- This is used by the Python backend for caching

-- Add indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_uploads_user_id ON uploads(user_id);
CREATE INDEX idx_uploads_created_at ON uploads(created_at);
```

---

### **Phase 5: Add Icons & Logos** (2-3 hours)

#### 5.1 Install Phosphor Icons

```bash
npm install @phosphor-icons/react
```

#### 5.2 Update Components with Icons

**File:** `components/marketing/Hero.tsx` (UPDATE)

```typescript
import { ArrowRight, ShieldCheck, Zap } from '@phosphor-icons/react';

export function Hero() {
  return (
    <section>
      {/* ... existing code ... */}

      <div className="flex gap-4">
        <Button>
          Get Started
          <ArrowRight size={20} weight="bold" />
        </Button>
      </div>

      {/* Features */}
      <div className="grid grid-cols-3 gap-4 mt-8">
        <div className="flex items-center gap-2">
          <Zap size={24} weight="fill" className="text-yellow-500" />
          <span>Instant Recognition</span>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck size={24} weight="fill" className="text-green-500" />
          <span>Bank-Grade Security</span>
        </div>
      </div>
    </section>
  );
}
```

#### 5.3 Add Exchange Logos

**Create:** `public/logos/exchanges/`

Download and add logos:
- `binance.svg`
- `coinbase.svg`
- `kraken.svg`
- `kucoin.svg`
- `bybit.svg`
- `robinhood.svg`
- `cashapp.svg`
- etc.

**Update:** `components/marketing/SupportedExchanges.tsx`

```typescript
import Image from 'next/image';

const exchanges = [
  { name: 'Binance', logo: '/logos/exchanges/binance.svg' },
  { name: 'Coinbase', logo: '/logos/exchanges/coinbase.svg' },
  { name: 'Kraken', logo: '/logos/exchanges/kraken.svg' },
  // ... etc
];

export function SupportedExchanges() {
  return (
    <section>
      <h2>Supported Exchanges</h2>

      <div className="grid grid-cols-4 md:grid-cols-7 gap-6">
        {exchanges.map(exchange => (
          <div key={exchange.name} className="flex flex-col items-center">
            <Image
              src={exchange.logo}
              alt={exchange.name}
              width={64}
              height={64}
              className="grayscale hover:grayscale-0 transition"
            />
            <span className="text-sm mt-2">{exchange.name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
```

---

## 🔐 Security Checklist

### **Critical Updates Needed:**

- [ ] Add rate limiting to upload endpoints
- [ ] Validate file size (max 50MB as per backend)
- [ ] Validate file type (CSV only)
- [ ] Add CSRF protection for upload forms
- [ ] Sanitize file names before storage
- [ ] Add virus scanning for uploaded files (optional)
- [ ] Implement user upload quotas
- [ ] Add audit logging for all uploads
- [ ] Encrypt sensitive data at rest in Supabase
- [ ] Add API key authentication for backend calls

---

## 📊 Testing Plan

### **Integration Tests Needed:**

1. **Upload Flow**
   - [ ] Upload known format (Binance, Coinbase)
   - [ ] Upload unknown format (triggers mapping UI)
   - [ ] Upload malformed CSV
   - [ ] Upload oversized file
   - [ ] Upload non-CSV file

2. **Export Flow**
   - [ ] Export to Koinly
   - [ ] Export to TurboTax
   - [ ] Export to CoinLedger
   - [ ] Export to ZenLedger
   - [ ] Verify file downloads correctly

3. **Authentication**
   - [ ] Sign up with email
   - [ ] Login with Google OAuth
   - [ ] Protected routes redirect to login
   - [ ] Session persists across refreshes

4. **Caching**
   - [ ] First upload creates fingerprint
   - [ ] Second upload with same format uses cache
   - [ ] Memory cache hit (fast)
   - [ ] Database cache hit (slower)
   - [ ] Cache miss (manual mapping)

---

## 🚀 Deployment

### **Environment Variables Needed:**

**.env.local (Development):**
```bash
# Backend
NEXT_PUBLIC_API_URL=http://localhost:8000

# Supabase
SUPABASE_URL=your-project.supabase.co
SUPABASE_KEY=your-anon-key

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-with-openssl

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# Sentry
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
```

**.env.production (Vercel):**
```bash
NEXT_PUBLIC_API_URL=https://lobster-app-qrn5c.ondigitalocean.app
# ... same as above with production values
```

---

## 📈 Next Steps Priority

### **Immediate (This Week):**
1. ✅ Icons & Logos (2-3 hours) - Visual polish
2. ✅ API Client Setup (1-2 hours) - Connect to backend
3. ✅ Upload Page MVP (3-4 hours) - Basic upload flow

### **Short-term (Next 2 Weeks):**
4. Column Mapping UI (4-6 hours)
5. Export Functionality (3-4 hours)
6. Authentication with Supabase (4-6 hours)

### **Medium-term (Month 1):**
7. Rate Limiting & Security (6-8 hours)
8. Testing Infrastructure (4-6 hours)
9. Critical Test Coverage (20-25 hours)

### **Long-term (Month 2-3):**
10. Full test coverage (40-50 hours)
11. Performance optimization
12. SOC 2 preparation

---

## 🎯 Recommendation

**Start with:**
1. **Icons & Logos** (quick win, improves marketing site)
2. **API Client** (foundation for all features)
3. **Upload MVP** (prove the integration works)

Then move to authentication and export features.

**Total Estimated Time:** 30-40 hours for full integration

---

## 📞 Questions to Answer

Before we start:
1. Do you want to keep the Python backend separate, or migrate to Next.js API routes?
2. What's your Supabase project URL and setup status?
3. Do you have exchange logos already, or should I find/create them?
4. Priority: Icons first, or upload functionality first?
