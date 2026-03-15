#!/bin/bash

# Script to run feature updates seed data
# Usage: ./seed-feature-updates.sh

echo "🌱 Running Feature Updates Seed Data..."
echo ""

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first."
    echo "   Visit: https://supabase.com/docs/guides/cli"
    exit 1
fi

# Check if linked to a project
if [ ! -f ".supabase/project-ref" ]; then
    echo "⚠️  Not linked to any Supabase project."
    echo "   Running: supabase link"
    supabase link
    if [ $? -ne 0 ]; then
        echo "❌ Failed to link project. Exiting."
        exit 1
    fi
fi

echo "✅ Linked to Supabase project"
echo ""

# Run the seed file
echo "📝 Running supabase-feature-updates-seed-latest.sql..."
echo ""

supabase db execute --file supabase-feature-updates-seed-latest.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Seed data successfully inserted!"
    echo ""
    echo "📱 Check your Updates page at: /updates"
    echo "🔧 Admin Feature Updates at: /admin (Updates tab)"
else
    echo ""
    echo "❌ Failed to run seed data."
    echo "   Please check the error message above."
    exit 1
fi
