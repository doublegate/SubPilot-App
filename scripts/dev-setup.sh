#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting SubPilot Development Environment${NC}"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

# Start services
echo -e "${BLUE}🐳 Starting PostgreSQL and Mailhog...${NC}"
# Navigate to project root to find docker-compose.dev.yml
cd "$(dirname "$0")/.."
if docker compose version &> /dev/null; then
    docker compose -f docker-compose.dev.yml up -d
else
    docker-compose -f docker-compose.dev.yml up -d
fi

# Wait for PostgreSQL to be ready
echo -e "${BLUE}⏳ Waiting for PostgreSQL to be ready...${NC}"
sleep 5

# Check if PostgreSQL is ready
POSTGRES_CONTAINER=$(docker ps -qf "name=postgres")
if [ -n "$POSTGRES_CONTAINER" ]; then
    if docker exec $POSTGRES_CONTAINER pg_isready -U subpilot -d subpilot_dev &> /dev/null; then
        echo -e "${GREEN}✅ PostgreSQL is ready!${NC}"
    else
        echo -e "${BLUE}⏳ Waiting a bit more for PostgreSQL...${NC}"
        sleep 5
        if docker exec $POSTGRES_CONTAINER pg_isready -U subpilot -d subpilot_dev; then
            echo -e "${GREEN}✅ PostgreSQL is ready!${NC}"
        else
            echo -e "${RED}❌ PostgreSQL is not ready. Please check the logs.${NC}"
            exit 1
        fi
    fi
else
    echo -e "${RED}❌ PostgreSQL container not found!${NC}"
    exit 1
fi

# Run database migrations
echo -e "${BLUE}🔄 Running database migrations...${NC}"
npm run db:push

# Seed the database
echo -e "${BLUE}🌱 Seeding database with test user...${NC}"
npm run db:seed

echo -e "${GREEN}✅ Development environment is ready!${NC}"
echo -e "${BLUE}📧 Mailhog UI: http://localhost:8025${NC}"
echo -e "${BLUE}🔐 Test login: test@subpilot.dev / testpassword123${NC}"
echo -e "${BLUE}🚀 Run 'npm run dev' to start the application${NC}"