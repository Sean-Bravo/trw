#!/bin/bash
# deploy.sh - Deploy Lambda functions and infrastructure for TaxFormatter
# Usage: ./deploy.sh [command]
#   Commands:
#     init      - Initialize Terraform
#     plan      - Show Terraform plan
#     apply     - Apply Terraform changes (infrastructure only)
#     package   - Package Lambda functions
#     deploy    - Package and deploy Lambda functions
#     all       - Full deployment (init + apply + deploy)
#     destroy   - Destroy all infrastructure (DANGEROUS)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="$SCRIPT_DIR/terraform"
HANDLERS_DIR="$SCRIPT_DIR/handlers"
SERVICES_DIR="$SCRIPT_DIR/services"
BUILD_DIR="$SCRIPT_DIR/.build"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check required tools
check_requirements() {
    log_info "Checking requirements..."

    if ! command -v terraform &> /dev/null; then
        log_error "Terraform not found. Install: brew install terraform"
        exit 1
    fi

    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI not found. Install: brew install awscli"
        exit 1
    fi

    if ! command -v python3 &> /dev/null; then
        log_error "Python 3 not found"
        exit 1
    fi

    if ! command -v pip3 &> /dev/null; then
        log_error "pip3 not found"
        exit 1
    fi

    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured. Run: aws configure"
        exit 1
    fi

    log_info "All requirements satisfied"
}

# Initialize Terraform
terraform_init() {
    log_info "Initializing Terraform..."
    cd "$TERRAFORM_DIR"
    terraform init
    log_info "Terraform initialized"
}

# Show Terraform plan
terraform_plan() {
    log_info "Planning Terraform changes..."
    cd "$TERRAFORM_DIR"

    if [ ! -f "terraform.tfvars" ]; then
        log_error "terraform.tfvars not found. Copy terraform.tfvars.example and fill in values."
        exit 1
    fi

    terraform plan
}

# Apply Terraform
terraform_apply() {
    log_info "Applying Terraform changes..."
    cd "$TERRAFORM_DIR"

    if [ ! -f "terraform.tfvars" ]; then
        log_error "terraform.tfvars not found. Copy terraform.tfvars.example and fill in values."
        exit 1
    fi

    terraform apply -auto-approve
    log_info "Infrastructure deployed"
}

# Package Lambda functions
package_lambdas() {
    log_info "Packaging Lambda functions..."

    # Clean build directory
    rm -rf "$BUILD_DIR"
    mkdir -p "$BUILD_DIR"

    # Create virtual environment for dependencies
    log_info "Creating virtual environment..."
    python3 -m venv "$BUILD_DIR/venv"
    source "$BUILD_DIR/venv/bin/activate"

    # Install dependencies
    log_info "Installing dependencies..."
    pip install --quiet --upgrade pip
    if [ -f "$SCRIPT_DIR/requirements.txt" ]; then
        pip install --quiet -r "$SCRIPT_DIR/requirements.txt" -t "$BUILD_DIR/package"
    fi

    # Get site-packages location
    SITE_PACKAGES="$BUILD_DIR/package"

    # Package webhook Lambda
    log_info "Packaging webhook Lambda..."
    mkdir -p "$BUILD_DIR/webhook"
    cp "$HANDLERS_DIR/webhook.py" "$BUILD_DIR/webhook/"
    if [ -d "$SITE_PACKAGES" ]; then
        cp -r "$SITE_PACKAGES"/* "$BUILD_DIR/webhook/" 2>/dev/null || true
    fi
    cd "$BUILD_DIR/webhook"
    zip -q -r "$BUILD_DIR/webhook.zip" .

    # Package scanner Lambda
    log_info "Packaging scanner Lambda..."
    mkdir -p "$BUILD_DIR/scanner"
    cp "$HANDLERS_DIR/scanner.py" "$BUILD_DIR/scanner/"
    if [ -d "$SITE_PACKAGES" ]; then
        cp -r "$SITE_PACKAGES"/* "$BUILD_DIR/scanner/" 2>/dev/null || true
    fi
    cd "$BUILD_DIR/scanner"
    zip -q -r "$BUILD_DIR/scanner.zip" .

    # Package processor Lambda (includes services)
    log_info "Packaging processor Lambda..."
    mkdir -p "$BUILD_DIR/processor"
    cp "$HANDLERS_DIR/processor.py" "$BUILD_DIR/processor/"

    # Copy services directory
    if [ -d "$SERVICES_DIR" ]; then
        cp -r "$SERVICES_DIR" "$BUILD_DIR/processor/"
    fi

    # Copy dependencies
    if [ -d "$SITE_PACKAGES" ]; then
        cp -r "$SITE_PACKAGES"/* "$BUILD_DIR/processor/" 2>/dev/null || true
    fi

    cd "$BUILD_DIR/processor"
    zip -q -r "$BUILD_DIR/processor.zip" .

    deactivate

    log_info "Lambda packages created:"
    ls -lh "$BUILD_DIR"/*.zip
}

# Deploy Lambda functions
deploy_lambdas() {
    log_info "Deploying Lambda functions..."

    # Get function names from Terraform outputs
    cd "$TERRAFORM_DIR"
    WEBHOOK_FUNCTION=$(terraform output -raw webhook_lambda_function_name 2>/dev/null || echo "")
    SCANNER_FUNCTION=$(terraform output -raw scanner_lambda_function_name 2>/dev/null || echo "")
    PROCESSOR_FUNCTION=$(terraform output -raw processor_lambda_function_name 2>/dev/null || echo "")

    if [ -z "$WEBHOOK_FUNCTION" ] || [ -z "$SCANNER_FUNCTION" ] || [ -z "$PROCESSOR_FUNCTION" ]; then
        log_error "Could not get function names from Terraform. Run 'terraform apply' first."
        exit 1
    fi

    # Deploy webhook
    log_info "Deploying webhook Lambda: $WEBHOOK_FUNCTION"
    aws lambda update-function-code \
        --function-name "$WEBHOOK_FUNCTION" \
        --zip-file "fileb://$BUILD_DIR/webhook.zip" \
        --no-cli-pager

    # Deploy scanner
    log_info "Deploying scanner Lambda: $SCANNER_FUNCTION"
    aws lambda update-function-code \
        --function-name "$SCANNER_FUNCTION" \
        --zip-file "fileb://$BUILD_DIR/scanner.zip" \
        --no-cli-pager

    # Deploy processor
    log_info "Deploying processor Lambda: $PROCESSOR_FUNCTION"
    aws lambda update-function-code \
        --function-name "$PROCESSOR_FUNCTION" \
        --zip-file "fileb://$BUILD_DIR/processor.zip" \
        --no-cli-pager

    log_info "Lambda functions deployed successfully!"

    # Print API Gateway URL
    API_URL=$(terraform output -raw api_gateway_url 2>/dev/null || echo "")
    if [ -n "$API_URL" ]; then
        log_info "API Gateway URL: $API_URL"
    fi
}

# Full deployment
full_deploy() {
    check_requirements
    terraform_init
    terraform_apply
    package_lambdas
    deploy_lambdas

    log_info "============================================"
    log_info "Deployment complete!"
    log_info "============================================"

    cd "$TERRAFORM_DIR"
    echo ""
    echo "Outputs:"
    terraform output
}

# Destroy infrastructure
destroy() {
    log_warn "This will DESTROY all infrastructure!"
    read -p "Are you sure? Type 'yes' to confirm: " confirm

    if [ "$confirm" != "yes" ]; then
        log_info "Aborted"
        exit 0
    fi

    cd "$TERRAFORM_DIR"
    terraform destroy -auto-approve

    log_info "Infrastructure destroyed"
}

# Main
case "${1:-help}" in
    init)
        check_requirements
        terraform_init
        ;;
    plan)
        check_requirements
        terraform_plan
        ;;
    apply)
        check_requirements
        terraform_apply
        ;;
    package)
        check_requirements
        package_lambdas
        ;;
    deploy)
        check_requirements
        package_lambdas
        deploy_lambdas
        ;;
    all)
        full_deploy
        ;;
    destroy)
        destroy
        ;;
    *)
        echo "Usage: $0 {init|plan|apply|package|deploy|all|destroy}"
        echo ""
        echo "Commands:"
        echo "  init      - Initialize Terraform"
        echo "  plan      - Show Terraform plan"
        echo "  apply     - Apply Terraform changes (infrastructure only)"
        echo "  package   - Package Lambda functions"
        echo "  deploy    - Package and deploy Lambda functions"
        echo "  all       - Full deployment (init + apply + deploy)"
        echo "  destroy   - Destroy all infrastructure (DANGEROUS)"
        exit 1
        ;;
esac
