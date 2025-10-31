#!/bin/bash

# Docker Test Script for Multimodal Chat Backend
# This script tests the Docker build and deployment

set -e

echo "=========================================="
echo "🐳 Docker Build and Test Script"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check if .env file exists
echo "1️⃣  Checking for .env file..."
if [ ! -f .env ]; then
    print_warning ".env file not found. Creating from .env.docker template..."
    cp .env.docker .env
    print_warning "Please edit .env file with your actual credentials before running docker-compose"
    echo ""
else
    print_status ".env file found"
    echo ""
fi

# Build the Docker image
echo "2️⃣  Building Docker image..."
docker build -t multimodal-chat-backend:latest . || {
    print_error "Docker build failed"
    exit 1
}
print_status "Docker image built successfully"
echo ""

# Check image size
echo "3️⃣  Checking Docker image size..."
IMAGE_SIZE=$(docker images multimodal-chat-backend:latest --format "{{.Size}}")
print_status "Image size: $IMAGE_SIZE"
echo ""

# Start services with docker-compose
echo "4️⃣  Starting services with docker-compose..."
docker-compose up -d || {
    print_error "Failed to start services"
    exit 1
}
print_status "Services started"
echo ""

# Wait for services to be ready
echo "5️⃣  Waiting for services to be healthy..."
sleep 10

# Check service status
echo ""
echo "📊 Service Status:"
docker-compose ps
echo ""

# Test MongoDB connection
echo "6️⃣  Testing MongoDB connection..."
docker exec multimodal-chat-mongodb mongosh --eval "db.adminCommand('ping')" --quiet > /dev/null 2>&1 && {
    print_status "MongoDB is running"
} || {
    print_error "MongoDB connection failed"
}
echo ""

# Test Redis connection
echo "7️⃣  Testing Redis connection..."
docker exec multimodal-chat-redis redis-cli ping > /dev/null 2>&1 && {
    print_status "Redis is running"
} || {
    print_error "Redis connection failed"
}
echo ""

# Wait for backend to be ready
echo "8️⃣  Waiting for backend to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -f http://localhost:3001/health > /dev/null 2>&1; then
        print_status "Backend is ready"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "   Waiting... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    print_error "Backend failed to start within expected time"
    echo ""
    echo "📋 Backend logs:"
    docker-compose logs backend --tail=50
    exit 1
fi
echo ""

# Test health endpoint
echo "9️⃣  Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:3001/health)
if [ $? -eq 0 ]; then
    print_status "Health check passed"
    echo "   Response: $HEALTH_RESPONSE" | jq '.' 2>/dev/null || echo "   Response: $HEALTH_RESPONSE"
else
    print_error "Health check failed"
fi
echo ""

# Test API documentation
echo "🔟 Testing API documentation endpoint..."
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api-docs/ | grep -q "200" && {
    print_status "API documentation is accessible at http://localhost:3001/api-docs"
} || {
    print_warning "API documentation endpoint returned non-200 status"
}
echo ""

# Show container logs
echo "📋 Recent backend logs:"
echo "=========================================="
docker-compose logs backend --tail=20
echo "=========================================="
echo ""

# Summary
echo "=========================================="
echo "✅ Docker Test Complete!"
echo "=========================================="
echo ""
echo "🔗 Service URLs:"
echo "   • Backend API: http://localhost:3001"
echo "   • Health Check: http://localhost:3001/health"
echo "   • API Docs: http://localhost:3001/api-docs"
echo "   • MongoDB: mongodb://localhost:27017"
echo "   • Redis: redis://localhost:6379"
echo ""
echo "📝 Useful Commands:"
echo "   • View logs: docker-compose logs -f backend"
echo "   • Stop services: docker-compose down"
echo "   • Restart: docker-compose restart"
echo "   • Remove everything: docker-compose down -v"
echo ""
