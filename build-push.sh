#!/bin/bash

# Production-Grade ECR Docker Build & Push Script
# This script builds and pushes Docker images to ECR with platform-specific support
# Fixes "exec format error" by ensuring correct architecture for ECS deployment

set -e

# =============================================================================
# QUICK CONFIGURATION SECTION - EDIT THESE VALUES FOR YOUR PROJECT
# =============================================================================

# AWS Configuration (Optional - can also use command line arguments)
DEFAULT_AWS_REGION="us-east-2"
DEFAULT_AWS_PROFILE="pe-dev"

# ECR Repository Configuration (Edit this for your project)
DEFAULT_ECR_REPOSITORY_URL="042196391339.dkr.ecr.us-east-2.amazonaws.com/pe-dev-music-backend"  # e.g., "123456789012.dkr.ecr.us-east-2.amazonaws.com/smarttly-backend"

# Build Configuration
DEFAULT_DOCKER_PLATFORM="linux/amd64"  # Fixes "exec format error" for standard ECS
DEFAULT_APP_NAME="pe-dev-music-backend"
DEFAULT_BUILD_CONTEXT="."

# =============================================================================
# QUICK USAGE EXAMPLES::
# =============================================================================
# 
# 1. First time setup: Edit the DEFAULT_* values above, then run:
#    ./build-push.sh quick-build v1.0.0
#
# 2. Full command example:
#    ./build-push.sh build-push smarttly-backend . \
#      --repository-url=123456789012.dkr.ecr.us-east-2.amazonaws.com/smarttly-backend \
#      --tag=v1.0.0 --platform=linux/amd64
#
# 3. Just ECR login:
#    ./build-push.sh login
#
# 4. Help and all options:
#    ./build-push.sh --help
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
DEFAULT_PLATFORM="$DEFAULT_DOCKER_PLATFORM"

# Global variables
AWS_REGION=""
AWS_PROFILE=""
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
AWS_SESSION_TOKEN=""
REPOSITORY_URL=""
IMAGE_TAG=""
PLATFORM="$DEFAULT_PLATFORM"
DOCKERFILE_PATH="."
CONTEXT_PATH="."
BUILD_ARGS=""
CACHE_FROM=""
NO_CACHE=false
PUSH_LATEST=true
VERBOSE=false

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
    echo "║                      Production ECR Build & Push Script                      ║"
    echo "╚══════════════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Function to validate dependencies
validate_dependencies() {
    local missing_deps=()
    
    if ! command -v docker &> /dev/null; then
        missing_deps+=("docker")
    fi
    
    if ! command -v aws &> /dev/null; then
        missing_deps+=("aws-cli")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Missing required dependencies: ${missing_deps[*]}"
        echo "Please install:"
        for dep in "${missing_deps[@]}"; do
            case $dep in
                docker)
                    echo "  Docker: https://docs.docker.com/get-docker/"
                    ;;
                aws-cli)
                    echo "  AWS CLI: https://aws.amazon.com/cli/"
                    ;;
            esac
        done
        exit 1
    fi
    
    print_verbose "All dependencies validated"
}

# Function to validate Docker platform
validate_platform() {
    local valid_platforms=("linux/amd64" "linux/arm64" "linux/arm/v7" "windows/amd64")
    local valid=false
    
    for valid_platform in "${valid_platforms[@]}"; do
        if [ "$PLATFORM" = "$valid_platform" ]; then
            valid=true
            break
        fi
    done
    
    if [ "$valid" = false ]; then
        print_error "Invalid platform: $PLATFORM"
        echo "Valid platforms: ${valid_platforms[*]}"
        exit 1
    fi
    
    # Warn about potential architecture mismatches
    if [[ "$PLATFORM" == "linux/arm64" ]]; then
        print_warning "Building for ARM64. Ensure your ECS instances support ARM (Graviton processors)"
    elif [[ "$PLATFORM" == "linux/amd64" ]]; then
        print_verbose "Building for AMD64/x86_64 - compatible with most ECS instances"
    fi
}
# Function to parse command line arguments
parse_arguments() {
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
            --repository-url=*)
                REPOSITORY_URL="${1#*=}"
                shift
                ;;
            --tag=*)
                IMAGE_TAG="${1#*=}"
                shift
                ;;
            --platform=*)
                PLATFORM="${1#*=}"
                shift
                ;;
            --dockerfile=*)
                DOCKERFILE_PATH="${1#*=}"
                shift
                ;;
            --context=*)
                CONTEXT_PATH="${1#*=}"
                shift
                ;;
            --build-arg=*)
                BUILD_ARGS="$BUILD_ARGS --build-arg ${1#*=}"
                shift
                ;;
            --cache-from=*)
                CACHE_FROM="${1#*=}"
                shift
                ;;
            --no-cache)
                NO_CACHE=true
                shift
                ;;
            --no-latest)
                PUSH_LATEST=false
                shift
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            *)
                # Store non-option arguments for command processing
                POSITIONAL_ARGS+=("$1")
                shift
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
    
    # Set AWS credentials if provided
    if [ -n "$AWS_ACCESS_KEY_ID" ]; then
        export AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID"
        print_status "Using provided AWS Access Key ID"
    fi
    
    if [ -n "$AWS_SECRET_ACCESS_KEY" ]; then
        export AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY"
        print_status "Using provided AWS Secret Access Key"
    fi
    
    if [ -n "$AWS_SESSION_TOKEN" ]; then
        export AWS_SESSION_TOKEN="$AWS_SESSION_TOKEN"
        print_status "Using provided AWS Session Token"
    fi
    
    print_status "AWS Region: $AWS_REGION"
}

# Function to login to ECR
ecr_login() {
    local region=${AWS_REGION:-$DEFAULT_REGION}
    
    print_status "Authenticating with ECR in region: $region"
    echo "I am here: $region : "
    echo $AWS_DEFAULT_REGION
    # Get AWS account ID
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null)
    echo "ACCOUNT ID : I am here : ${ACCOUNT_ID}"
    echo $AWS_DEFAULT_REGION
    if [ -z "$ACCOUNT_ID" ]; then
        print_error "Failed to get AWS account ID. Please check your AWS credentials."
        exit 1
    fi
    
    local registry_url="$ACCOUNT_ID.dkr.ecr.$region.amazonaws.com"
    
    # Login to ECR
    if aws ecr get-login-password --region "$region" | docker login --username AWS --password-stdin "$registry_url" >/dev/null 2>&1; then
        print_success "Successfully authenticated with ECR"
        print_status "Registry: $registry_url"
    else
        print_error "Failed to authenticate with ECR"
        exit 1
    fi
    echo "ACCOUNT ID : I am here now: ${ACCOUNT_ID}"
}

# Function to quick build with default configuration
quick_build() {
    local tag=${1:-latest}
    
    if [ -z "$DEFAULT_ECR_REPOSITORY_URL" ]; then
        print_error "DEFAULT_ECR_REPOSITORY_URL is not configured"
        echo "Please edit this script and set DEFAULT_ECR_REPOSITORY_URL at the top"
        echo "Example: DEFAULT_ECR_REPOSITORY_URL=\"123456789012.dkr.ecr.us-east-2.amazonaws.com/your-repo\""
        exit 1
    fi
    
    print_status "Quick build with default configuration"
    print_status "Repository: $DEFAULT_ECR_REPOSITORY_URL"
    print_status "Tag: $tag"
    print_status "Platform: $DEFAULT_PLATFORM (fixes exec format error)"
    
    # Set global variables for build_and_push function
    REPOSITORY_URL="$DEFAULT_ECR_REPOSITORY_URL"
    IMAGE_TAG="$tag"
    PLATFORM="$DEFAULT_PLATFORM"
    
    if [ -n "$DEFAULT_AWS_PROFILE" ]; then
        AWS_PROFILE="$DEFAULT_AWS_PROFILE"
    fi
    
    # Setup AWS environment
    setup_aws_environment
    
    # Build and push
    build_and_push "$DEFAULT_APP_NAME" "$DEFAULT_BUILD_CONTEXT"
}

# Function to list ECR repositories
list_repositories() {
    local region=${AWS_REGION:-$DEFAULT_REGION}
    
    print_status "Listing ECR repositories in region: $region"
    
    aws ecr describe-repositories --region "$region" --query 'repositories[*].[repositoryName,repositoryUri]' --output table
}

# Function to build and push image
build_and_push() {
    local image_name=$1
    local dockerfile_path=${2:-$DOCKERFILE_PATH}
    local region=${AWS_REGION:-$DEFAULT_REGION}
    
    if [ -z "$image_name" ]; then
        print_error "Image name not specified"
        echo "Usage: $0 build-push <image-name> [dockerfile-path] --repository-url=<repo-url>"
        exit 1
    fi
    
    if [ -z "$REPOSITORY_URL" ]; then
        print_error "Repository URL not specified"
        echo "Usage: $0 build-push <image-name> [dockerfile-path] --repository-url=<repo-url>"
        exit 1
    fi
    
    # Validate dockerfile exists
    local dockerfile_location="$dockerfile_path"
    if [ -d "$dockerfile_path" ]; then
        dockerfile_location="$dockerfile_path/Dockerfile"
    fi
    
    if [ ! -f "$dockerfile_location" ]; then
        print_error "Dockerfile not found at: $dockerfile_location"
        exit 1
    fi
    
    print_verbose "Using Dockerfile: $dockerfile_location"
    print_verbose "Build context: $CONTEXT_PATH"
    
    # Generate timestamp for consistent tagging
    local timestamp_tag=$(date +%Y%m%d-%H%M%S)
    local git_hash=""
    
    # Try to get git commit hash for additional tagging
    if command -v git &> /dev/null && git rev-parse --git-dir > /dev/null 2>&1; then
        git_hash=$(git rev-parse --short HEAD)
        print_verbose "Git commit hash: $git_hash"
    fi
    
    local custom_tag=""
    if [ -n "$IMAGE_TAG" ]; then
        custom_tag="$IMAGE_TAG"
        print_status "Custom tag specified: $custom_tag"
    fi
    
    print_status "Building image: $image_name"
    print_status "Repository URL: $REPOSITORY_URL"
    print_status "Platform: $PLATFORM"
    print_status "Context: $CONTEXT_PATH"
    
    local tags_to_push=()
    if [ "$PUSH_LATEST" = true ]; then
        tags_to_push+=("latest")
    fi
    tags_to_push+=("$timestamp_tag")
    if [ -n "$custom_tag" ]; then
        tags_to_push+=("$custom_tag")
    fi
    if [ -n "$git_hash" ]; then
        tags_to_push+=("git-$git_hash")
    fi
    
    print_status "Tags to push: ${tags_to_push[*]}"
    
    # Login to ECR first
    ecr_login
    
    # Prepare Docker build command
    local docker_build_cmd="docker build"
    docker_build_cmd+=" --platform $PLATFORM"
    docker_build_cmd+=" -f $dockerfile_location"
    
    if [ "$NO_CACHE" = true ]; then
        docker_build_cmd+=" --no-cache"
    fi
    
    if [ -n "$CACHE_FROM" ]; then
        docker_build_cmd+=" --cache-from $CACHE_FROM"
    fi
    
    if [ -n "$BUILD_ARGS" ]; then
        docker_build_cmd+="$BUILD_ARGS"
    fi
    
    docker_build_cmd+=" -t $image_name:latest"
    docker_build_cmd+=" $CONTEXT_PATH"
    
    # Build the image
    print_status "Building Docker image for platform: $PLATFORM..."
    print_verbose "Build command: $docker_build_cmd"
    
    if ! eval "$docker_build_cmd"; then
        print_error "Docker build failed"
        exit 1
    fi
    
    print_success "Docker build completed successfully"
    
    # Tag all versions
    print_status "Tagging image with all versions..."
    for tag in "${tags_to_push[@]}"; do
        docker tag "$image_name:latest" "$REPOSITORY_URL:$tag"
        print_verbose "Tagged: $REPOSITORY_URL:$tag"
    done
    
    # Push all tags
    print_status "Pushing images to repository..."
    local push_failures=()
    
    for tag in "${tags_to_push[@]}"; do
        print_status "Pushing $REPOSITORY_URL:$tag..."
        if ! docker push "$REPOSITORY_URL:$tag"; then
            push_failures+=("$tag")
            print_error "Failed to push tag: $tag"
        else
            print_success "Pushed: $REPOSITORY_URL:$tag"
        fi
    done
    
    if [ ${#push_failures[@]} -ne 0 ]; then
        print_error "Failed to push the following tags: ${push_failures[*]}"
        exit 1
    fi
    
    print_success "All images pushed successfully!"
    print_status "Repository: $REPOSITORY_URL"
    print_status "Available tags: ${tags_to_push[*]}"
    
    # Cleanup local images to save space (optional)
    if [ "$VERBOSE" = true ]; then
        print_status "Cleaning up local images..."
        docker rmi "$image_name:latest" 2>/dev/null || true
        for tag in "${tags_to_push[@]}"; do
            docker rmi "$REPOSITORY_URL:$tag" 2>/dev/null || true
        done
    fi
}

# Function to show help
show_help() {
    print_banner
    echo "Production-Grade ECR Docker Build & Push Script"
    echo "Fixes 'exec format error' by ensuring correct platform architecture"
    echo ""
    echo "Usage: $0 <command> [options] [arguments]"
    echo ""
    echo "Commands:"
    echo "  quick-build [tag]                     Quick build with default config (edit script to configure)"
    echo "  login                                 Login to ECR"
    echo "  list                                  List ECR repositories"
    echo "  build-push <image> [dockerfile-path]  Build and push Docker image"
    echo "  help                                  Show this help message"
    echo ""
    echo "Required Options for build-push:"
    echo "  --repository-url=URL              Full repository URL (e.g., 123456789012.dkr.ecr.us-east-2.amazonaws.com/my-repo)"
    echo ""
    echo "Platform & Build Options:"
    echo "  --platform=PLATFORM               Docker platform (default: linux/amd64 for ECS compatibility)"
    echo "                                     Options: linux/amd64, linux/arm64, linux/arm/v7, windows/amd64"
    echo "  --dockerfile=PATH                  Path to Dockerfile (default: ./Dockerfile)"
    echo "  --context=PATH                     Build context path (default: .)"
    echo "  --build-arg=KEY=VALUE              Build-time variables (can use multiple times)"
    echo "  --cache-from=IMAGE                 Use image as cache source"
    echo "  --no-cache                         Build without using cache"
    echo "  --no-latest                        Don't push 'latest' tag"
    echo ""
    echo "AWS Authentication Options:"
    echo "  --aws-region=REGION               AWS region (default: us-east-2)"
    echo "  --aws-profile=PROFILE             AWS profile to use"
    echo "  --aws-access-key-id=KEY           AWS access key ID"
    echo "  --aws-secret-access-key=SECRET    AWS secret access key"
    echo "  --aws-session-token=TOKEN         AWS session token (for temporary credentials)"
    echo ""
    echo "Tagging Options:"
    echo "  --tag=TAG                         Custom tag to push (in addition to timestamp and git hash)"
    echo "  --verbose                         Enable verbose output"
    echo ""
    echo "Examples:"
    echo "  # EASIEST: Configure defaults at top of script, then:"
    echo "  $0 quick-build v1.0.0               # Uses your configured defaults"
    echo "  $0 quick-build latest               # Quick build with latest tag"
    echo ""
    echo "  # FULL CONTROL: Specify everything manually:"
    echo "  # Fix exec format error by building for correct platform"
    echo "  $0 build-push backend . \\"
    echo "     --repository-url=123456789012.dkr.ecr.us-east-2.amazonaws.com/backend \\"
    echo "     --platform=linux/amd64 --tag=v1.0.0"
    echo ""
    echo "  # Build with custom Dockerfile and context"
    echo "  $0 build-push backend \\"
    echo "     --repository-url=123456789012.dkr.ecr.us-east-1.amazonaws.com/backend \\"
    echo "     --dockerfile=docker/Dockerfile.prod --context=. --tag=release-2024"
    echo ""
    echo "  # Build for ARM-based ECS (Graviton)"
    echo "  $0 build-push api \\"
    echo "     --repository-url=123456789012.dkr.ecr.us-east-2.amazonaws.com/api \\"
    echo "     --platform=linux/arm64 --tag=latest"
    echo ""
    echo "  # Build with build arguments"
    echo "  $0 build-push app \\"
    echo "     --repository-url=123456789012.dkr.ecr.us-east-2.amazonaws.com/app \\"
    echo "     --build-arg=NODE_ENV=production --build-arg=VERSION=1.2.3"
    echo ""
    echo "Platform Compatibility:"
    echo "  linux/amd64    - Standard ECS instances (Intel/AMD) - RECOMMENDED"
    echo "  linux/arm64    - ECS on Graviton processors"
    echo "  linux/arm/v7   - ARM 32-bit (rare)"
    echo ""
    echo "Note: The script automatically tags with timestamp and git hash for traceability"
}

# Main script logic
main() {
    # Initialize array for positional arguments
    POSITIONAL_ARGS=()
    
    # Parse all arguments first
    parse_arguments "$@"
    
    # Validate dependencies
    validate_dependencies
    
    # Validate platform
    validate_platform
    
    # Set up AWS environment based on parsed arguments
    setup_aws_environment
    
    # Process commands using positional arguments
    set -- "${POSITIONAL_ARGS[@]}"
    
    case "${1:-}" in
        login)
            print_banner
            ecr_login
            ;;
        list)
            print_banner
            list_repositories
            ;;
        quick-build)
            print_banner
            quick_build "$2"
            ;;
        build-push)
            print_banner
            build_and_push "$2" "$3"
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "Unknown command: ${1:-}"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
    echo "DEBUG: CLI ARGS: $@"
fi
