#!/bin/bash

# AI Creative Builder Setup Script
# This script helps you set up the development environment

echo "🚀 Setting up AI Creative Builder..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 16+ and try again."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 16 ]; then
    print_error "Node.js version 16+ is required. Current version: $(node -v)"
    exit 1
fi

print_success "Node.js $(node -v) is installed"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    print_warning "PostgreSQL is not installed or not in PATH."
    print_status "Please install PostgreSQL 12+ and ensure it's running."
fi

# Check if FFmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    print_warning "FFmpeg is not installed or not in PATH."
    print_status "Please install FFmpeg for video processing functionality."
    print_status "macOS: brew install ffmpeg"
    print_status "Ubuntu: sudo apt install ffmpeg"
    print_status "Windows: Download from https://ffmpeg.org/download.html"
fi

# Install dependencies
print_status "Installing dependencies..."

# Install root dependencies
npm install

# Install server dependencies
print_status "Installing server dependencies..."
cd server && npm install && cd ..

# Install client dependencies
print_status "Installing client dependencies..."
cd client && npm install && cd ..

print_success "Dependencies installed successfully!"

# Check environment files
if [ ! -f "server/.env" ]; then
    print_warning "Server .env file not found. Creating from example..."
    cp server/.env.example server/.env
    print_status "Please update server/.env with your database URL and API keys"
fi

if [ ! -f "client/.env" ]; then
    print_status "Creating client .env file..."
    echo "REACT_APP_API_URL=http://localhost:5000/api" > client/.env
fi

print_success "Environment files are ready!"

# Database setup instructions
echo ""
print_status "📊 Database Setup Instructions:"
echo "1. Create PostgreSQL database:"
echo "   createdb ai_creative_builder"
echo ""
echo "2. Update your database URL in server/.env:"
echo "   DATABASE_URL=postgresql://username:password@localhost:5432/ai_creative_builder"
echo ""
echo "3. Run database migrations:"
echo "   cd server && npm run db:migrate"

# API Keys setup instructions
echo ""
print_status "🔑 API Keys Setup:"
echo "1. Gemini API Key:"
echo "   - Visit: https://makersuite.google.com/app/apikey"
echo "   - Create API key and add to server/.env as GEMINI_API_KEY"
echo ""
echo "2. ElevenLabs API Key:"
echo "   - Visit: https://elevenlabs.io"
echo "   - Go to Profile → API Keys"
echo "   - Create API key and add to server/.env as ELEVENLABS_API_KEY"

# Final instructions
echo ""
print_success "🎉 Setup completed!"
echo ""
print_status "Next steps:"
echo "1. Set up your database and API keys as shown above"
echo "2. Run 'npm run dev' to start both servers"
echo "3. Visit http://localhost:3000 to access the application"
echo ""
print_status "For more information, see README.md"
