#!/bin/bash

# Build script for Firebase deployment
echo "🔥 Building STT Compare App for Firebase Hosting..."

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the static export
echo "🏗️ Building Next.js static export..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully!"
    echo "📁 Static files generated in 'out' directory"
    echo ""
    echo "🚀 To deploy to Firebase:"
    echo "1. Update .firebaserc with your Firebase project ID"
    echo "2. Run: firebase deploy"
    echo ""
    echo "🧪 To test locally:"
    echo "Run: npm run serve:static"
    echo "Then open: http://localhost:3000"
else
    echo "❌ Build failed!"
    exit 1
fi