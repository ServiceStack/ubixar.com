#!/bin/bash

# Deploy Next.js build to C# wwwroot
#
# This script builds the Next.js app and ensures the output
# is properly placed in the C# backend's wwwroot directory

set -e

echo "🚀 Building Next.js application..."

# Navigate to Next.js project
cd nextjs-app

# Run build
npm run build

echo "✅ Next.js build complete"
echo "📦 Output location: MyApp/wwwroot/_next/"
echo ""
echo "To test the build:"
echo "  1. Run the C# backend: cd MyApp && dotnet run"
echo "  2. Open https://localhost:5001 in your browser"
