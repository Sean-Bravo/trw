# Environment Variables for TaxFormatter Lambda Backend

## Terraform Variables (`terraform.tfvars`)

Copy `terraform.tfvars.example` to `terraform.tfvars` and fill in:

```hcl
# AWS Configuration
aws_region   = "us-east-1"
project_name = "taxformatter"
environment  = "prod"

# Database (Neon PostgreSQL)
database_url = "postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require"

# Application Secrets
nextauth_secret       = "your-nextauth-secret-from-env"
anthropic_api_key     = "sk-ant-xxx"
openai_api_key        = ""           # Optional
google_gemini_api_key = ""           # Optional

# Email
alert_email      = "alerts@yourdomain.com"
ses_sender_email = "noreply@taxformatter.com"

# Domain
domain_name = "taxformatter.com"
```

## Lambda Environment Variables

These are automatically set by Terraform:

| Variable | Set By | Description |
|----------|--------|-------------|
| `ENVIRONMENT` | Terraform | `prod`, `staging`, or `dev` |
| `UPLOADS_BUCKET` | Terraform | S3 bucket for uploads |
| `RESULTS_BUCKET` | Terraform | S3 bucket for processed results |
| `PROCESSING_QUEUE` | Terraform | SQS queue URL (scanner only) |
| `SECRETS_ARN` | Terraform | AWS Secrets Manager ARN |

## Secrets Manager Values

Stored in AWS Secrets Manager and accessed at runtime:

| Secret Key | Description |
|------------|-------------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | Anthropic Claude API key |
| `OPENAI_API_KEY` | OpenAI API key (optional) |
| `GOOGLE_GEMINI_API_KEY` | Google Gemini API key (optional) |
| `NEXTAUTH_SECRET` | NextAuth JWT secret |
| `SES_SENDER_EMAIL` | Email sender address |

## Next.js Frontend Environment

Add to `.env.local`:

```env
# AWS Lambda API Gateway URL (get from terraform output)
API_GATEWAY_URL=https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com
```

## Deployment Steps

1. **Copy and configure Terraform variables:**
   ```bash
   cd backend/terraform
   cp terraform.tfvars.example terraform.tfvars
   # Edit terraform.tfvars with your values
   ```

2. **Deploy infrastructure:**
   ```bash
   ./deploy.sh init   # Initialize Terraform
   ./deploy.sh plan   # Preview changes
   ./deploy.sh apply  # Create infrastructure
   ```

3. **Deploy Lambda code:**
   ```bash
   ./deploy.sh deploy # Package and upload Lambda functions
   ```

4. **Get API Gateway URL:**
   ```bash
   cd terraform
   terraform output api_gateway_url
   ```

5. **Update Next.js config:**
   Add the API Gateway URL to your `.env.local` or Vercel environment variables.

## Verification

After deployment, verify with:

```bash
# Check Lambda functions
aws lambda list-functions --query 'Functions[?starts_with(FunctionName, `taxformatter`)]'

# Check S3 buckets
aws s3 ls | grep taxformatter

# Check SQS queues
aws sqs list-queues --queue-name-prefix taxformatter

# Test API Gateway
curl -X POST https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod/presigned-url \
  -H "Content-Type: application/json" \
  -d '{"filename": "test.csv", "contentType": "text/csv"}'
```
