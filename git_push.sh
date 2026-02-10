#!/bin/bash

# Clear screen for better visibility
clear

echo "📦 JunoDesk Git Helper"
echo "======================"
echo ""

# 1. Show Status
echo "🔍 Checking current status..."
git status
echo ""
echo "======================"

# 2. Confirm Add
read -p "Do you want to stage ALL changes (git add .)? (y/n): " confirm_add
if [[ $confirm_add != "y" && $confirm_add != "Y" ]]; then
    echo "❌ Operation cancelled."
    exit 0
fi

echo "➕ Staging files..."
git add .

# 3. Commit Message
echo ""
read -p "📝 Enter your commit message: " commit_msg

if [[ -z "$commit_msg" ]]; then
    echo "❌ Commit message cannot be empty. Aborting."
    exit 1
fi

echo "💾 Committing..."
git commit -m "$commit_msg"

# 4. Push
echo ""
echo "🚀 Pushing to remote..."
git push

echo ""
echo "✅ Done! Changes are live on GitHub."
