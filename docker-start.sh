#!/bin/bash
# ============================================================
# Industrial-Surface-Defect-Detection-System Docker Start Script
# Usage:
#   ./docker-start.sh              # Development mode
#   ./docker-start.sh --prod       # Production mode
#   ./docker-start.sh --status     # Check service status
#   ./docker-start.sh --logs       # View logs
#   ./docker-start.sh --stop       # Stop all services
#   ./docker-start.sh --rebuild    # Rebuild and restart
#   ./docker-start.sh --with-ai    # Include AI/ML service
# ============================================================

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Default mode
MODE="dev"
COMPOSE_FILES="-f docker-compose.yml"

# Functions
log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }

print_banner() {
    echo -e "${BLUE}"
    echo "============================================================"
    echo "  Industrial-Surface-Defect-Detection-System Docker Manager"
    echo "============================================================"
    echo -e "${NC}"
}

print_usage() {
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  (no args)    Start in development mode"
    echo "  --prod       Start in production mode"
    echo "  --with-ai    Include AI/ML service"
    echo "  --status     Show service status"
    echo "  --logs       Follow all service logs"
    echo "  --logs=<svc> Follow specific service logs (e.g., --logs=backend)"
    echo "  --stop       Stop all services"
    echo "  --rebuild    Rebuild images and restart"
    echo "  --clean      Stop and remove all containers, volumes, networks"
    echo "  --help       Show this help message"
    echo ""
    echo "Production mode requires .env.prod file. See .env.prod.template"
}

# Parse arguments
WITH_AI=false
for arg in "$@"; do
    case $arg in
        --prod)
            MODE="prod"
            COMPOSE_FILES="-f docker-compose.yml -f docker-compose.prod.yml"
            ;;
        --with-ai)
            WITH_AI=true
            ;;
        --status)
            print_banner
            log_info "Service Status:"
            docker compose $COMPOSE_FILES ps
            exit 0
            ;;
        --logs)
            print_banner
            log_info "Following all service logs..."
            docker compose $COMPOSE_FILES logs -f
            exit 0
            ;;
        --logs=*)
            SERVICE="${arg#*=}"
            print_banner
            log_info "Following $SERVICE logs..."
            docker compose $COMPOSE_FILES logs -f "$SERVICE"
            exit 0
            ;;
        --stop)
            print_banner
            log_info "Stopping all services..."
            docker compose $COMPOSE_FILES down
            log_success "All services stopped."
            exit 0
            ;;
        --rebuild)
            MODE="rebuild"
            ;;
        --clean)
            print_banner
            log_warn "This will remove ALL containers, volumes, and networks!"
            read -p "Are you sure? (y/N): " confirm
            if [[ "$confirm" == "y" || "$confirm" == "Y" ]]; then
                docker compose $COMPOSE_FILES down -v --rmi local
                log_success "Cleaned up."
            else
                log_info "Cancelled."
            fi
            exit 0
            ;;
        --help|-h)
            print_usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $arg"
            print_usage
            exit 1
            ;;
    esac
done

print_banner

# Pre-flight checks
log_info "Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! docker info &> /dev/null; then
    log_error "Docker daemon is not running. Please start Docker."
    exit 1
fi

if ! command -v docker compose &> /dev/null && ! docker compose version &> /dev/null 2>&1; then
    log_error "Docker Compose is not available."
    exit 1
fi

log_success "Docker is ready."

# Production mode checks
if [ "$MODE" = "prod" ]; then
    log_info "Production mode selected."

    if [ ! -f ".env.prod" ]; then
        log_error ".env.prod file not found!"
        log_info "Please copy and configure: cp .env.prod.template .env.prod"
        exit 1
    fi

    # Load production env
    export $(grep -v '^#' .env.prod | xargs)

    # Security warning
    if [[ "$DB_PASSWORD" == *"CHANGE_THIS"* ]] || [[ "$APP_SECURITY_SECRET" == *"CHANGE_THIS"* ]]; then
        log_error "Production secrets have not been configured!"
        log_error "Please update .env.prod with real secure values."
        exit 1
    fi

    log_success "Production environment loaded."
fi

# Add AI profile if requested
if [ "$WITH_AI" = true ]; then
    COMPOSE_FILES="$COMPOSE_FILES --profile ai"
    log_info "AI/ML service will be included."
fi

# Execute based on mode
case $MODE in
    dev)
        log_info "Starting services in development mode..."
        log_info "This may take a while on first run (building images)..."
        echo ""

        docker compose $COMPOSE_FILES up -d --build

        echo ""
        log_success "Services started!"
        echo ""
        log_info "Service URLs:"
        log_info "  Frontend:   http://localhost:3000"
        log_info "  Backend:    http://localhost:18081"
        log_info "  PostgreSQL: localhost:5432"
        echo ""
        log_info "View logs:    $0 --logs"
        log_info "Check status: $0 --status"
        log_info "Stop:         $0 --stop"
        ;;

    prod)
        log_info "Starting services in production mode..."
        log_info "Building optimized images..."
        echo ""

        docker compose $COMPOSE_FILES up -d --build

        echo ""
        log_success "Production services started!"
        echo ""
        log_info "Access via Nginx:"
        log_info "  HTTP:  http://localhost:80"
        log_info "  HTTPS: https://localhost:443 (requires SSL certs)"
        echo ""
        log_info "View logs:    $0 --logs"
        log_info "Check status: $0 --status"
        ;;

    rebuild)
        log_info "Rebuilding all images..."
        docker compose $COMPOSE_FILES build --no-cache
        log_info "Restarting services..."
        docker compose $COMPOSE_FILES up -d
        log_success "Rebuild complete."
        ;;
esac

# Wait for services to be healthy
echo ""
log_info "Waiting for services to be ready..."

MAX_WAIT=120
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
    HEALTHY_COUNT=$(docker compose $COMPOSE_FILES ps --format json 2>/dev/null | grep -c '"healthy"' || true)
    if [ "$HEALTHY_COUNT" -ge 2 ]; then
        log_success "Services are healthy!"
        break
    fi
    sleep 5
    WAITED=$((WAITED + 5))
    echo -n "."
done
echo ""

if [ $WAITED -ge $MAX_WAIT ]; then
    log_warn "Some services may not be fully ready yet."
    log_info "Check status with: $0 --status"
fi

exit 0
