#!/bin/bash

# 🚀 Portfolio Investment Platform - Deploy Script
# Este script automatiza o processo de deploy para GitHub, Vercel e Supabase

set -e  # Exit on any error

echo "🚀 Portfolio Investment Platform - Deploy Automation"
echo "=================================================="

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

# Check if git is initialized
if [ ! -d ".git" ]; then
    print_status "Initializing Git repository..."
    git init
    print_success "Git repository initialized"
fi

# Check if we have uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    print_status "Adding all files to Git..."
    git add .
    
    print_status "Committing changes..."
    read -p "Enter commit message (or press Enter for default): " commit_message
    if [ -z "$commit_message" ]; then
        commit_message="Deploy: Update project for production"
    fi
    git commit -m "$commit_message"
    print_success "Changes committed"
fi

# Check if remote origin exists
if ! git remote get-url origin > /dev/null 2>&1; then
    print_warning "No remote origin found. Please add your GitHub repository:"
    echo "1. Create a new repository on GitHub"
    echo "2. Copy the repository URL"
    read -p "Enter your GitHub repository URL: " repo_url
    git remote add origin "$repo_url"
    print_success "Remote origin added"
fi

# Push to GitHub
print_status "Pushing to GitHub..."
git branch -M main
git push -u origin main
print_success "Code pushed to GitHub"

echo ""
echo "🎉 GitHub Setup Complete!"
echo "=================================================="
echo ""

# Frontend Build Test
print_status "Testing frontend build..."
cd frontend
if npm run build; then
    print_success "Frontend build successful"
else
    print_error "Frontend build failed. Please fix errors before deploying."
    exit 1
fi
cd ..

echo ""
echo "📋 Next Steps for Complete Deploy:"
echo "=================================================="
echo ""

echo "🔗 1. VERCEL DEPLOY (Frontend):"
echo "   • Go to https://vercel.com"
echo "   • Import your GitHub repository"
echo "   • Set build settings:"
echo "     - Framework: Vite"
echo "     - Build Command: cd frontend && npm run build"
echo "     - Output Directory: frontend/dist"
echo "   • Add environment variables:"
echo "     - VITE_API_URL=https://your-backend-url"
echo ""

echo "🗄️  2. SUPABASE SETUP (Database):"
echo "   • Go to https://supabase.com"
echo "   • Create new project"
echo "   • Copy connection string from Settings > Database"
echo "   • Run migrations: cd backend && alembic upgrade head"
echo ""

echo "🚀 3. BACKEND DEPLOY (Railway/Render):"
echo "   Railway:"
echo "   • Go to https://railway.app"
echo "   • Connect GitHub repository"
echo "   • Add environment variables from env.example"
echo ""
echo "   Render:"
echo "   • Go to https://render.com"
echo "   • Create new Web Service"
echo "   • Connect GitHub repository"
echo "   • Set build/start commands"
echo ""

echo "⚙️  4. ENVIRONMENT VARIABLES:"
echo "   Backend (Railway/Render):"
echo "   • DATABASE_URL=your-supabase-connection-string"
echo "   • SECRET_KEY=generate-secure-key"
echo "   • ENVIRONMENT=production"
echo "   • BACKEND_CORS_ORIGINS=[\"https://your-vercel-app.vercel.app\"]"
echo ""
echo "   Frontend (Vercel):"
echo "   • VITE_API_URL=https://your-backend-url"
echo ""

echo "🔧 5. POST-DEPLOY SETUP:"
echo "   • Test all endpoints"
echo "   • Create admin user"
echo "   • Import sample data"
echo "   • Configure custom domain (optional)"
echo ""

print_success "Deploy preparation complete!"
print_status "Your code is now on GitHub and ready for deployment"

echo ""
echo "📚 Useful Links:"
echo "• GitHub: https://github.com"
echo "• Vercel: https://vercel.com"
echo "• Supabase: https://supabase.com"
echo "• Railway: https://railway.app"
echo "• Render: https://render.com"
echo ""

echo "🆘 Need help? Check the README.md for detailed instructions"
