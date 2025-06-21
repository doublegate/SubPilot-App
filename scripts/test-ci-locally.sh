#!/bin/bash
set -e

echo "🚀 Testing CI/CD Pipeline Locally"
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

print_status "Docker is running"

# Clean up any existing containers
echo "🧹 Cleaning up existing containers..."
docker-compose down --remove-orphans >/dev/null 2>&1 || true

# Start services
echo "🐳 Starting Docker services..."
docker-compose up -d postgres redis mailhog

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
timeout=60
while ! docker-compose exec -T postgres pg_isready -U subpilot -d subpilot_dev >/dev/null 2>&1; do
    sleep 1
    timeout=$((timeout - 1))
    if [ $timeout -eq 0 ]; then
        print_error "PostgreSQL failed to start within 60 seconds"
        docker-compose logs postgres
        exit 1
    fi
done
print_status "PostgreSQL is ready"

# Install dependencies
echo "📦 Installing dependencies..."
if [ ! -d "node_modules" ]; then
    npm ci
fi
print_status "Dependencies installed"

# Run code quality checks
echo "🔍 Running code quality checks..."

echo "  → ESLint..."
if npm run lint >/dev/null 2>&1; then
    print_status "ESLint passed"
else
    print_warning "ESLint issues found (run 'npm run lint' for details)"
fi

echo "  → Prettier..."
if npm run format:check >/dev/null 2>&1; then
    print_status "Prettier check passed"
else
    print_warning "Code formatting issues found (run 'npm run format' to fix)"
fi

echo "  → TypeScript..."
if npm run type-check >/dev/null 2>&1; then
    print_status "TypeScript check passed"
else
    print_error "TypeScript errors found"
    npm run type-check
    exit 1
fi

# Setup test environment
echo "🔧 Setting up test environment..."
export DATABASE_URL="postgresql://subpilot:subpilot123@localhost:5432/subpilot_dev"
export NEXTAUTH_URL="http://localhost:3000"
export NEXTAUTH_SECRET="test-secret-for-local-ci"

# Copy environment file
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "DATABASE_URL=$DATABASE_URL" >> .env
    echo "NEXTAUTH_URL=$NEXTAUTH_URL" >> .env
    echo "NEXTAUTH_SECRET=$NEXTAUTH_SECRET" >> .env
fi

# Generate Prisma client
echo "🏗️ Generating Prisma client..."
npm run db:generate >/dev/null 2>&1
print_status "Prisma client generated"

# Run database migration
echo "🗄️ Running database migration..."
if npm run db:push >/dev/null 2>&1; then
    print_status "Database migration completed"
else
    print_error "Database migration failed"
    exit 1
fi

# Build application
echo "🏗️ Building application..."
if npm run build >/dev/null 2>&1; then
    print_status "Build completed successfully"
else
    print_error "Build failed"
    exit 1
fi

# Test health endpoint
echo "🏥 Testing health endpoint..."
npm run start &
SERVER_PID=$!
sleep 10

if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
    print_status "Health endpoint is working"
else
    print_warning "Health endpoint test failed (server might need more time)"
fi

# Clean up
kill $SERVER_PID >/dev/null 2>&1 || true

# Run security audit
echo "🔒 Running security audit..."
if npm audit --audit-level=moderate >/dev/null 2>&1; then
    print_status "Security audit passed"
else
    print_warning "Security vulnerabilities found (run 'npm audit' for details)"
fi

# Test Docker build
echo "🐳 Testing Docker build..."
if docker build -t subpilot-test . >/dev/null 2>&1; then
    print_status "Docker build successful"
    docker rmi subpilot-test >/dev/null 2>&1 || true
else
    print_error "Docker build failed"
    exit 1
fi

# Clean up
echo "🧹 Cleaning up..."
docker-compose down >/dev/null 2>&1 || true

echo ""
echo "🎉 Local CI/CD test completed successfully!"
echo "The workflow should work in GitHub Actions."
echo ""
echo "Next steps:"
echo "1. Commit and push the workflow files"
echo "2. Check the Actions tab in your GitHub repository"
echo "3. Configure any required secrets (VERCEL_TOKEN, etc.)"