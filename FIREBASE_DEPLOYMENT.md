# Firebase Hosting Deployment Guide 🔥

## Prerequisites

1. **Firebase CLI** installed globally:
   ```bash
   npm install -g firebase-tools
   ```

2. **Firebase Project** created at [Firebase Console](https://console.firebase.google.com/)

## Setup Steps

### 1. Configure Firebase Project

Update `.firebaserc` with your Firebase project ID:
```json
{
  "projects": {
    "default": "your-actual-firebase-project-id"
  }
}
```

### 2. Login to Firebase (if not already)
```bash
firebase login
```

### 3. Initialize Firebase (optional, already configured)
```bash
firebase init hosting
# Select existing project
# Choose 'out' as public directory
# Configure as single-page app: Yes
# Don't overwrite existing files
```

## Build & Deploy

### Quick Deploy
```bash
# Build and deploy in one command
./build-firebase.sh && firebase deploy
```

### Manual Steps

1. **Build static files:**
   ```bash
   npm run build
   ```

2. **Test locally (optional):**
   ```bash
   npm run serve:static
   ```
   Open http://localhost:3000

3. **Deploy to Firebase:**
   ```bash
   firebase deploy
   ```

## Configuration Details

### Next.js Configuration (`next.config.ts`)
- ✅ `output: 'export'` - Enables static export
- ✅ `images: { unoptimized: true }` - Disables image optimization
- ✅ `trailingSlash: true` - Better compatibility

### Firebase Configuration (`firebase.json`)
- ✅ `public: "out"` - Uses Next.js export directory
- ✅ SPA routing with rewrites to `/index.html`
- ✅ Optimized caching headers for assets
- ✅ Proper cache control for HTML/JSON files

## Environment Variables

For production deployment, make sure to:

1. **Create `.env.production.local`** with production values:
   ```env
   NEXT_PUBLIC_DEEPGRAM_API_KEY=your_production_key
   NEXT_PUBLIC_VERBUM_API_KEY=your_production_key
   ```

2. **Or set environment variables in Firebase:**
   ```bash
   firebase functions:config:set someservice.key="THE API KEY"
   ```

## Troubleshooting

### Build Issues
- **Error: Dynamic imports**: All components should be client-side (`'use client'`)
- **Error: Server functions**: Remove `getServerSideProps`, `getStaticProps`
- **Error: API routes**: Not supported in static export, use external APIs

### Deployment Issues
- **404 errors**: Check `firebase.json` rewrites configuration
- **Assets not loading**: Verify `basePath` in `next.config.ts` if using subdirectory
- **CORS errors**: Configure proper headers in `firebase.json`

## Project Structure After Build

```
out/
├── index.html              # Main app entry
├── _next/
│   ├── static/            # Static assets
│   └── ...
├── 404.html               # Error page
└── ...                    # Other static files
```

## Useful Commands

```bash
# Build only
npm run build

# Test build locally
npm run serve:static

# Deploy to Firebase
firebase deploy

# View deployment
firebase open hosting:site

# View logs
firebase functions:log
```

## Notes

- ✅ App is configured for **client-side only** (CSR)
- ✅ All API calls happen in the browser
- ✅ WebSocket connections work from static hosting
- ✅ Real-time features fully functional
- ⚠️ No server-side rendering (SSR)
- ⚠️ No API routes (all external)