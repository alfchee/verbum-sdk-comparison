#!/bin/bash

# Complete Firebase deployment script
echo "🔥 STT Compare App - Firebase Deployment 🔥"
echo "============================================"

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found!"
    echo "Install it with: npm install -g firebase-tools"
    exit 1
fi

# Check if .firebaserc is configured
if [ ! -f ".firebaserc" ]; then
    echo "❌ .firebaserc not found!"
    echo "Run: firebase init hosting"
    exit 1
fi

# Check if user is logged in to Firebase
if ! firebase projects:list &> /dev/null; then
    echo "🔑 Please login to Firebase..."
    firebase login
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check for production environment file
if [ ! -f ".env.production.local" ]; then
    echo "⚠️  Production environment file not found!"
    echo "Create .env.production.local with your API keys"
    echo "Use .env.production.example as template"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Build the application
echo "🏗️ Building Next.js static export..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully!"
    
    # Show build info
    echo ""
    echo "📊 Build Summary:"
    echo "- Output directory: out/"
    echo "- Files generated: $(find out -type f | wc -l)"
    echo "- Total size: $(du -sh out | cut -f1)"
    
    # Ask for deployment confirmation
    echo ""
    read -p "🚀 Deploy to Firebase Hosting? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🚀 Deploying to Firebase..."
        firebase deploy --only hosting
        
        if [ $? -eq 0 ]; then
            echo ""
            echo "🎉 Deployment successful!"
            echo "Your app is now live on Firebase Hosting!"
            echo ""
            echo "🔗 View your site:"
            firebase open hosting:site
        else
            echo "❌ Deployment failed!"
            exit 1
        fi
    else
        echo "⏸️  Deployment cancelled"
        echo "Files are ready in 'out' directory"
        echo "Deploy manually with: firebase deploy"
    fi
else
    echo "❌ Build failed!"
    exit 1
fi