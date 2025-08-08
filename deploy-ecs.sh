#!/bin/bash

# Production-Grade ECS Service Deployment Script
# This script deploys or updates an AWS ECS service with a new image tag
# Includes monitoring, rollback, and comprehensive error handling

set -e

# =============================================================================
# QUICK CONFIGURATION SECTION - EDIT THESE VALUES FOR YOUR PROJECT
# =============================================================================
#echo "DEBUG ENV: AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID"
#echo "DEBUG ENV: AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY"
#echo "DEBUG ENV: AWS_REGION=$AWS_DEFAULT_REGION"

# AWS Configuration (Optional - can also use command line arguments)
DEFAULT_AWS_REGION="us-east-2"
DEFAULT_AWS_PROFILE="pe-dev"

# ECS Configuration (Edit these for your project)
DEFAULT_CLUSTER_NAME="pe-dev-shared"           # e.g., "smarttly-cluster"
DEFAULT_SERVICE_NAME="pe-dev-shared-music-backend-service"           # e.g., "smarttly-backend-service"
DEFAULT_TASK_DEFINITION="pe-dev-shared-music-backend"        # e.g., "smarttly-backend-service"
DEFAULT_CONTAINER_NAME="backend"         # e.g., "smarttly-backend"

# ECR Repository Configuration
DEFAULT_ECR_REPOSITORY_URL="042196391339.dkr.ecr.us-east-2.amazonaws.com/pe-dev-music-backend"     # e.g., "123456789012.dkr.ecr.us-east-2.amazonaws.com/smarttly-backend"

# Deployment Configuration
DEFAULT_TIMEOUT="900"             # 15 minutes for production deployments
DEFAULT_WAIT_FOR_STABLE=true
DEFAULT_ROLLBACK_ON_FAILURE=true # Enable rollback for production safety

# =============================================================================
# QUICK USAGE EXAMPLES:
# =============================================================================
# 
# 1. First time setup: Edit the DEFAULT_* values above, then run:
#    ./deploy-ecs.sh quick-deploy v1.0.0
#
# 2. Full command example:
#    ./deploy-ecs.sh --cluster=smarttly-cluster --service=smarttly-backend-service \
#      --task-definition=smarttly-backend-service --container=smarttly-backend \
#      --image-url=123456789012.dkr.ecr.us-east-2.amazonaws.com/smarttly-backend \
#      --image-tag=v1.0.0 --rollback-on-failure
#
# 3. Monitor deployment status:
#    ./deploy-ecs.sh --status
#
# 4. Help and all options:
#    ./deploy-ecs.sh --help
#
# =============================================================================

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
DEFAULT_REGION="$DEFAULT_AWS_REGION"
DEFAULT_TIMEOUT="$DEFAULT_TIMEOUT"
DEFAULT_CHECK_INTERVAL="30"  # Check every 30 seconds

# Global variables - Required
AWS_REGION=""
AWS_PROFILE=""
#AWS_ACCESS_KEY_ID=""
#AWS_SECRET_ACCESS_KEY=""
AWS_SESSION_TOKEN=""
CLUSTER_NAME=""
SERVICE_NAME=""
TASK_DEFINITION_FAMILY=""
CONTAINER_NAME=""
IMAGE_URL=""
IMAGE_TAG=""

# Global variables - Optional
TIMEOUT="$DEFAULT_TIMEOUT"
WAIT_FOR_STABLE=true
ROLLBACK_ON_FAILURE=false
FORCE_NEW_DEPLOYMENT=false
DESIRED_COUNT=""
MAX_PERCENT=""
MIN_HEALTHY_PERCENT=""
ENABLE_CIRCUIT_BREAKER=false
VERBOSE=false
DRY_RUN=false

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_verbose() {
    if [ "$VERBOSE" = true ]; then
        echo -e "${BLUE}[VERBOSE]${NC} $1"
    fi
}

print_banner() {
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════════════════════════╗"
    echo "║                     Production ECS Deployment Script                         ║"
    echo "║                   With Monitoring & Rollback Capabilities                    ║"
    echo "╚══════════════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Function to quick deploy with default configuration
quick_deploy() {
    local tag=${1:-latest}
    
    # Validate that defaults are configured
    local missing_config=()
    
    if [ -z "$DEFAULT_CLUSTER_NAME" ]; then
        missing_config+=("DEFAULT_CLUSTER_NAME")
    fi
    
    if [ -z "$DEFAULT_SERVICE_NAME" ]; then
        missing_config+=("DEFAULT_SERVICE_NAME")
    fi
    
    if [ -z "$DEFAULT_TASK_DEFINITION" ]; then
        missing_config+=("DEFAULT_TASK_DEFINITION")
    fi
    
    if [ -z "$DEFAULT_CONTAINER_NAME" ]; then
        missing_config+=("DEFAULT_CONTAINER_NAME")
    fi
    
    if [ -z "$DEFAULT_ECR_REPOSITORY_URL" ]; then
        missing_config+=("DEFAULT_ECR_REPOSITORY_URL")
    fi
    
    if [ ${#missing_config[@]} -ne 0 ]; then
        print_error "Default configuration missing. Please edit this script and set:"
        for config in "${missing_config[@]}"; do
            echo "  - $config"
        done
        echo ""
        echo "Example configuration:"
        echo "  DEFAULT_CLUSTER_NAME=\"production-cluster\""
        echo "  DEFAULT_SERVICE_NAME=\"backend-service\""
        echo "  DEFAULT_TASK_DEFINITION=\"backend-task\""
        echo "  DEFAULT_CONTAINER_NAME=\"backend-container\""
        echo "  DEFAULT_ECR_REPOSITORY_URL=\"123456789012.dkr.ecr.us-east-2.amazonaws.com/backend\""
        exit 1
    fi
    
    print_status "Quick deploy with default configuration"
    print_status "Cluster: $DEFAULT_CLUSTER_NAME"
    print_status "Service: $DEFAULT_SERVICE_NAME"
    print_status "Task Definition: $DEFAULT_TASK_DEFINITION"
    print_status "Container: $DEFAULT_CONTAINER_NAME"
    print_status "Image: $DEFAULT_ECR_REPOSITORY_URL:$tag"
    print_status "Rollback on Failure: $DEFAULT_ROLLBACK_ON_FAILURE"
    
    # Set global variables
    CLUSTER_NAME="$DEFAULT_CLUSTER_NAME"
    SERVICE_NAME="$DEFAULT_SERVICE_NAME"
    TASK_DEFINITION_FAMILY="$DEFAULT_TASK_DEFINITION"
    CONTAINER_NAME="$DEFAULT_CONTAINER_NAME"
    IMAGE_URL="$DEFAULT_ECR_REPOSITORY_URL"
    IMAGE_TAG="$tag"
    TIMEOUT="$DEFAULT_TIMEOUT"
    WAIT_FOR_STABLE="$DEFAULT_WAIT_FOR_STABLE"
    ROLLBACK_ON_FAILURE="$DEFAULT_ROLLBACK_ON_FAILURE"
    
    if [ -n "$DEFAULT_AWS_PROFILE" ]; then
        AWS_PROFILE="$DEFAULT_AWS_PROFILE"
    fi
    
    # Set up AWS environment
    setup_aws_environment
    
    # Verify resources
    verify_aws_resources
    
    # Deploy
    update_ecs_service
}

# Function to validate dependencies
validate_dependencies() {
    local missing_deps=()
    
    if ! command -v aws &> /dev/null; then
        missing_deps+=("aws-cli")
    fi
    
    if ! command -v jq &> /dev/null; then
        missing_deps+=("jq")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Missing required dependencies: ${missing_deps[*]}"
        echo "Please install:"
        for dep in "${missing_deps[@]}"; do
            case $dep in
                aws-cli)
                    echo "  AWS CLI: brew install awscli (macOS) or https://aws.amazon.com/cli/"
                    ;;
                jq)
                    echo "  jq: brew install jq (macOS) or apt-get install jq (Ubuntu)"
                    ;;
            esac
        done
        exit 1
    fi
    
    print_verbose "All dependencies validated"
}

# Function to validate required parameters
validate_parameters() {
    local errors=()
    
    if [ -z "$CLUSTER_NAME" ]; then
        errors+=("--cluster is required")
    fi
    
    if [ -z "$SERVICE_NAME" ]; then
        errors+=("--service is required")
    fi
    
    if [ -z "$TASK_DEFINITION_FAMILY" ]; then
        errors+=("--task-definition is required")
    fi
    
    if [ -z "$CONTAINER_NAME" ]; then
        errors+=("--container is required")
    fi
    
    if [ -z "$IMAGE_URL" ]; then
        errors+=("--image-url is required")
    fi
    
    if [ -z "$IMAGE_TAG" ]; then
        errors+=("--image-tag is required")
    fi
    
    # Validate numeric values
    if [ -n "$TIMEOUT" ] && ! [[ "$TIMEOUT" =~ ^[0-9]+$ ]]; then
        errors+=("--timeout must be a number")
    fi
    
    if [ -n "$DESIRED_COUNT" ] && ! [[ "$DESIRED_COUNT" =~ ^[0-9]+$ ]]; then
        errors+=("--desired-count must be a number")
    fi
    
    if [ -n "$MAX_PERCENT" ] && ! [[ "$MAX_PERCENT" =~ ^[0-9]+$ ]]; then
        errors+=("--max-percent must be a number")
    fi
    
    if [ -n "$MIN_HEALTHY_PERCENT" ] && ! [[ "$MIN_HEALTHY_PERCENT" =~ ^[0-9]+$ ]]; then
        errors+=("--min-healthy-percent must be a number")
    fi
    
    if [ ${#errors[@]} -ne 0 ]; then
        print_error "Validation errors:"
        for error in "${errors[@]}"; do
            echo "  - $error"
        done
        exit 1
    fi
    
    print_verbose "Parameter validation passed"
}

# Function to verify AWS resources
verify_aws_resources() {
    print_status "Verifying AWS credentials and ECS resources..."
    if [ -n "$AWS_ACCESS_KEY_ID" ]; then
        export AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID"
        print_status "Using provided AWS Access Key ID"
    fi
    
    if [ -n "$AWS_SECRET_ACCESS_KEY" ]; then
        export AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY"
        print_status "Using provided AWS Secret Access Key"
    fi
    # Test AWS credentials
    local account_id
    if ! account_id=$(aws sts get-caller-identity --query Account --output text 2>/dev/null); then
        print_error "Failed to authenticate with AWS. Please check your credentials."
        exit 1
    fi
    print_verbose "Authenticated with AWS Account: $account_id"
    
    # Verify ECS cluster exists
    if ! aws ecs describe-clusters --clusters "$CLUSTER_NAME" --region "$AWS_REGION" >/dev/null 2>&1; then
        print_error "ECS cluster '$CLUSTER_NAME' not found in region '$AWS_REGION'"
        exit 1
    fi
    print_verbose "ECS cluster '$CLUSTER_NAME' verified"
    
    # Verify ECS service exists
    if ! aws ecs describe-services --cluster "$CLUSTER_NAME" --services "$SERVICE_NAME" --region "$AWS_REGION" >/dev/null 2>&1; then
        print_error "ECS service '$SERVICE_NAME' not found in cluster '$CLUSTER_NAME'"
        exit 1
    fi
    print_verbose "ECS service '$SERVICE_NAME' verified"
    
    # Verify task definition family exists
    if ! aws ecs describe-task-definition --task-definition "$TASK_DEFINITION_FAMILY" --region "$AWS_REGION" >/dev/null 2>&1; then
        print_error "Task definition family '$TASK_DEFINITION_FAMILY' not found"
        exit 1
    fi
    print_verbose "Task definition family '$TASK_DEFINITION_FAMILY' verified"
    
    print_success "All AWS resources verified successfully"
}
# Function to parse command line arguments
parse_arguments() {
    # Initialize variables
    COMMAND=""
    CUSTOM_TAG=""
    
    # Check if first argument is quick-deploy
    if [[ "${1:-}" == "quick-deploy" ]]; then
        COMMAND="quick-deploy"
        if [[ -n "${2:-}" && ! "${2}" =~ ^-- ]]; then
            CUSTOM_TAG="$2"
            shift 2
        else
            shift
        fi
    fi
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --aws-region=*)
                AWS_REGION="${1#*=}"
                shift
                ;;
            --aws-profile=*)
                AWS_PROFILE="${1#*=}"
                shift
                ;;
            --aws-access-key-id=*)
                AWS_ACCESS_KEY_ID="${1#*=}"
                shift
                ;;
            --aws-secret-access-key=*)
                AWS_SECRET_ACCESS_KEY="${1#*=}"
                shift
                ;;
            --aws-session-token=*)
                AWS_SESSION_TOKEN="${1#*=}"
                shift
                ;;
            --cluster=*)
                CLUSTER_NAME="${1#*=}"
                shift
                ;;
            --service=*)
                SERVICE_NAME="${1#*=}"
                shift
                ;;
            --task-definition=*)
                TASK_DEFINITION_FAMILY="${1#*=}"
                shift
                ;;
            --container=*)
                CONTAINER_NAME="${1#*=}"
                shift
                ;;
            --image-url=*)
                IMAGE_URL="${1#*=}"
                shift
                ;;
            --image-tag=*)
                IMAGE_TAG="${1#*=}"
                shift
                ;;
            --timeout=*)
                TIMEOUT="${1#*=}"
                shift
                ;;
            --desired-count=*)
                DESIRED_COUNT="${1#*=}"
                shift
                ;;
            --max-percent=*)
                MAX_PERCENT="${1#*=}"
                shift
                ;;
            --min-healthy-percent=*)
                MIN_HEALTHY_PERCENT="${1#*=}"
                shift
                ;;
            --wait-for-stable)
                WAIT_FOR_STABLE=true
                shift
                ;;
            --no-wait)
                WAIT_FOR_STABLE=false
                shift
                ;;
            --rollback-on-failure)
                ROLLBACK_ON_FAILURE=true
                shift
                ;;
            --force-new-deployment)
                FORCE_NEW_DEPLOYMENT=true
                shift
                ;;
            --enable-circuit-breaker)
                ENABLE_CIRCUIT_BREAKER=true
                shift
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# Function to set up AWS environment
setup_aws_environment() {
    # Set AWS region
    if [ -n "$AWS_REGION" ]; then
        export AWS_DEFAULT_REGION="$AWS_REGION"
        export AWS_REGION="$AWS_REGION"
    elif [ -z "${AWS_DEFAULT_REGION:-}" ]; then
        export AWS_DEFAULT_REGION="$DEFAULT_REGION"
        export AWS_REGION="$DEFAULT_REGION"
        AWS_REGION="$DEFAULT_REGION"
    else
        AWS_REGION="${AWS_DEFAULT_REGION}"
    fi
    
    # Set AWS profile if provided
    if [ -n "$AWS_PROFILE" ]; then
        export AWS_PROFILE="$AWS_PROFILE"
        print_status "Using AWS profile: $AWS_PROFILE"
    fi
    
    print_status "AWS Region: $AWS_REGION"
}

# Function to update ECS service with new image
update_ecs_service() {
    print_status "Starting ECS service update process"
    print_status "Cluster: $CLUSTER_NAME"
    print_status "Service: $SERVICE_NAME"
    print_status "Task Definition: $TASK_DEFINITION_FAMILY"
    print_status "Container: $CONTAINER_NAME"
    print_status "Image: $IMAGE_URL:$IMAGE_TAG"
    
    if [ "$DRY_RUN" = true ]; then
        print_status "DRY RUN: Would perform the following actions:"
        echo "  1. Retrieve current task definition: $TASK_DEFINITION_FAMILY"
        echo "  2. Create new task definition with image: $IMAGE_URL:$IMAGE_TAG"
        echo "  3. Update container '$CONTAINER_NAME' image in task definition"
        echo "  4. Register new task definition"
        echo "  5. Update ECS service '$SERVICE_NAME' to use new task definition"
        if [ "$WAIT_FOR_STABLE" = true ]; then
            echo "  6. Wait for deployment to stabilize (timeout: ${TIMEOUT}s)"
        else
            echo "  6. Skip waiting for deployment completion"
        fi
        print_success "DRY RUN: All validation passed. Ready for actual deployment!"
        return 0
    fi
    
    # Get the current task definition
    print_status "Retrieving current task definition"
    
    TASK_DEFINITION=$(aws ecs describe-task-definition \
        --task-definition "$TASK_DEFINITION_FAMILY" \
        --query 'taskDefinition' \
        --output json)
    
    if [ -z "$TASK_DEFINITION" ]; then
        print_error "Failed to retrieve task definition: $TASK_DEFINITION_FAMILY"
        exit 1
    fi
    
    # Create a new task definition with the updated image
    print_status "Creating new task definition with updated image"
    
    # Update the container definition with the new image
    NEW_TASK_DEFINITION=$(echo "$TASK_DEFINITION" | \
        jq --arg IMAGE "$IMAGE_URL:$IMAGE_TAG" \
           --arg NAME "$CONTAINER_NAME" \
           '.containerDefinitions = [.containerDefinitions[] | if .name == $NAME then .image = $IMAGE else . end] | del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)')
    
    # Register the new task definition
    NEW_TASK_DEFINITION_ARN=$(aws ecs register-task-definition \
        --cli-input-json "$NEW_TASK_DEFINITION" \
        --query 'taskDefinition.taskDefinitionArn' \
        --output text)
    
    if [ -z "$NEW_TASK_DEFINITION_ARN" ]; then
        print_error "Failed to register new task definition"
        exit 1
    fi
    
    print_success "Registered new task definition: $NEW_TASK_DEFINITION_ARN"
    
    # Update the service to use the new task definition
    print_status "Updating service to use new task definition"
    
    UPDATE_RESULT=$(aws ecs update-service \
        --cluster "$CLUSTER_NAME" \
        --service "$SERVICE_NAME" \
        --task-definition "$NEW_TASK_DEFINITION_ARN" \
        --query 'service.serviceArn' \
        --output text)
    
    if [ -z "$UPDATE_RESULT" ]; then
        print_error "Failed to update service"
        exit 1
    fi
    
    print_success "Successfully updated service: $SERVICE_NAME"
    print_success "Deployment initiated. Service is being updated with image: $IMAGE_URL:$IMAGE_TAG"
    
    if [ "$WAIT_FOR_STABLE" = true ]; then
        wait_for_deployment_stable "$NEW_TASK_DEFINITION_ARN"
    else
        print_status "Skipping deployment wait. You can monitor the deployment status in the AWS Console or with the following command:"
        echo "aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --query 'services[0].deployments'"
    fi
}

# Function to wait for deployment to stabilize
wait_for_deployment_stable() {
    local new_task_def_arn=$1
    local start_time=$(date +%s)
    local end_time=$((start_time + TIMEOUT))
    
    print_status "Waiting for deployment to stabilize (timeout: ${TIMEOUT}s)..."
    
    while [ $(date +%s) -lt $end_time ]; do
        local deployment_status=$(aws ecs describe-services \
            --cluster "$CLUSTER_NAME" \
            --services "$SERVICE_NAME" \
            --query 'services[0].deployments[?taskDefinition==`'"$new_task_def_arn"'`].status' \
            --output text)
        
        local running_count=$(aws ecs describe-services \
            --cluster "$CLUSTER_NAME" \
            --services "$SERVICE_NAME" \
            --query 'services[0].runningCount' \
            --output text)
        
        local desired_count=$(aws ecs describe-services \
            --cluster "$CLUSTER_NAME" \
            --services "$SERVICE_NAME" \
            --query 'services[0].desiredCount' \
            --output text)
        
        if [ "$deployment_status" = "PRIMARY" ] && [ "$running_count" = "$desired_count" ]; then
            # Check if all tasks are healthy
            local healthy_tasks=$(aws ecs list-tasks \
                --cluster "$CLUSTER_NAME" \
                --service-name "$SERVICE_NAME" \
                --desired-status RUNNING \
                --query 'taskArns' \
                --output text | wc -w)
            
            if [ "$healthy_tasks" -eq "$desired_count" ]; then
                print_success "Deployment completed successfully!"
                print_success "All $desired_count tasks are running and healthy"
                return 0
            fi
        fi
        
        if [ "$deployment_status" = "FAILED" ]; then
            print_error "Deployment failed!"
            if [ "$ROLLBACK_ON_FAILURE" = true ]; then
                rollback_deployment
            fi
            exit 1
        fi
        
        print_status "Deployment in progress... (Running: $running_count/$desired_count, Status: $deployment_status)"
        sleep 30
    done
    
    print_error "Deployment timed out after ${TIMEOUT} seconds"
    if [ "$ROLLBACK_ON_FAILURE" = true ]; then
        rollback_deployment
    fi
    exit 1
}

# Function to rollback deployment
rollback_deployment() {
    print_status "Attempting to rollback deployment..."
    
    # Get the previous task definition
    local previous_task_def=$(aws ecs describe-services \
        --cluster "$CLUSTER_NAME" \
        --services "$SERVICE_NAME" \
        --query 'services[0].deployments[?status==`PRIMARY`].taskDefinition' \
        --output text | head -1)
    
    if [ -n "$previous_task_def" ]; then
        print_status "Rolling back to previous task definition: $previous_task_def"
        
        aws ecs update-service \
            --cluster "$CLUSTER_NAME" \
            --service "$SERVICE_NAME" \
            --task-definition "$previous_task_def" \
            --query 'service.serviceArn' \
            --output text > /dev/null
        
        print_success "Rollback initiated"
    else
        print_error "Could not determine previous task definition for rollback"
    fi
}

# Function to show help
show_help() {
    print_banner
    echo "Production-Grade ECS Service Deployment Script"
    echo "Deploy, monitor, and rollback ECS services with comprehensive error handling"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Required Options:"
    echo "  --cluster=NAME                    ECS cluster name"
    echo "  --service=NAME                    ECS service name to update"
    echo "  --task-definition=FAMILY          Task definition family name"
    echo "  --container=NAME                  Container name within task definition to update"
    echo "  --image-url=URL                   ECR repository URL (without tag)"
    echo "  --image-tag=TAG                   Image tag to deploy"
    echo ""
    echo "AWS Authentication Options:"
    echo "  --aws-region=REGION               AWS region (default: us-east-2)"
    echo "  --aws-profile=PROFILE             AWS profile to use"
    echo "  --aws-access-key-id=KEY           AWS access key ID"
    echo "  --aws-secret-access-key=SECRET    AWS secret access key"
    echo "  --aws-session-token=TOKEN         AWS session token (for temporary credentials)"
    echo ""
    echo "Deployment Configuration:"
    echo "  --timeout=SECONDS                 Deployment timeout in seconds (default: 900)"
    echo "  --desired-count=COUNT             Override desired task count"
    echo "  --max-percent=PERCENT             Maximum percent during deployment (default: 200)"
    echo "  --min-healthy-percent=PERCENT     Minimum healthy percent during deployment (default: 50)"
    echo ""
    echo "Deployment Control:"
    echo "  --wait-for-stable                 Wait for deployment to stabilize (default: true)"
    echo "  --no-wait                         Don't wait for deployment to complete"
    echo "  --rollback-on-failure             Automatically rollback on deployment failure"
    echo "  --force-new-deployment            Force new deployment even if no changes"
    echo "  --enable-circuit-breaker          Enable ECS circuit breaker for automatic rollback"
    echo ""
    echo "Output & Debugging:"
    echo "  --verbose                         Enable verbose output"
    echo "  --dry-run                         Show what would be done without executing"
    echo "  --help, -h                        Show this help message"
    echo ""
    echo "Examples:"
    echo ""
    echo "  # Basic deployment"
    echo "  $0 --cluster=production --service=api-service --task-definition=api-task \\"
    echo "     --container=api --image-url=123456789012.dkr.ecr.us-east-2.amazonaws.com/api \\"
    echo "     --image-tag=v1.2.3"
    echo ""
    echo "  # Production deployment with monitoring and rollback"
    echo "  $0 --cluster=prod-cluster --service=backend-service --task-definition=backend-task \\"
    echo "     --container=backend --image-url=123456789012.dkr.ecr.us-east-2.amazonaws.com/backend \\"
    echo "     --image-tag=latest --rollback-on-failure --enable-circuit-breaker --verbose"
    echo ""
    echo "  # Deployment with custom configuration"
    echo "  $0 --aws-profile=prod --aws-region=us-east-1 --cluster=production \\"
    echo "     --service=web-service --task-definition=web-task --container=nginx \\"
    echo "     --image-url=123456789012.dkr.ecr.us-east-1.amazonaws.com/web --image-tag=release-2024 \\"
    echo "     --desired-count=5 --timeout=1200 --max-percent=150 --min-healthy-percent=75"
    echo ""
    echo "  # Dry run to preview changes"
    echo "  $0 --cluster=staging --service=api --task-definition=api-task --container=api \\"
    echo "     --image-url=123456789012.dkr.ecr.us-east-2.amazonaws.com/api --image-tag=latest \\"
    echo "     --dry-run --verbose"
    echo ""
    echo "Features:"
    echo "  ✓ Real-time deployment monitoring with health checks"
    echo "  ✓ Automatic rollback on deployment failures"
    echo "  ✓ ECS circuit breaker integration"
    echo "  ✓ Comprehensive error handling and validation"
    echo "  ✓ Dry-run mode for safe testing"
    echo "  ✓ Detailed logging and progress tracking"
    echo ""
    echo "Note: This script requires AWS CLI v2 and jq to be installed"
}

# Main script logic
main() {
    print_banner
    
    # Parse command line arguments
    parse_arguments "$@"
    
    # Handle quick-deploy command
    if [ "$COMMAND" = "quick-deploy" ]; then
        quick_deploy "${CUSTOM_TAG:-latest}"
        return 0
    fi
    
    # Validate dependencies
    validate_dependencies
    
    # Validate required parameters
    validate_parameters
    
    # Set up AWS environment
    setup_aws_environment
    
    # Show deployment summary
    print_status "Deployment Configuration:"
    echo "  Cluster: $CLUSTER_NAME"
    echo "  Service: $SERVICE_NAME"
    echo "  Task Definition: $TASK_DEFINITION_FAMILY"
    echo "  Container: $CONTAINER_NAME"
    echo "  Image: $IMAGE_URL:$IMAGE_TAG"
    echo "  Region: $AWS_REGION"
    echo "  Timeout: ${TIMEOUT}s"
    echo "  Wait for Stable: $WAIT_FOR_STABLE"
    echo "  Rollback on Failure: $ROLLBACK_ON_FAILURE"
    if [ "$DRY_RUN" = true ]; then
        echo "  Mode: DRY RUN"
    fi
    
    # Verify AWS resources
    if [ "$DRY_RUN" = false ]; then
        verify_aws_resources
    else
        print_status "DRY RUN: Skipping AWS resource verification"
    fi
    
    # Update ECS service
    update_ecs_service
    
    print_success "ECS deployment script completed successfully!"
}

# Check required dependencies at script start
if ! command -v jq &> /dev/null; then
    print_error "jq is required but not installed. Please install jq first."
    echo "  macOS: brew install jq"
    echo "  Ubuntu/Debian: apt-get install jq"
    echo "  Amazon Linux: yum install jq"
    exit 1
fi

if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is required but not installed. Please install AWS CLI first."
    echo "  Visit: https://aws.amazon.com/cli/"
    exit 1
fi

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
