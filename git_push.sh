#!/bin/bash

git status          # See what's changed
git add .           # Stage all
git commit -m "Update: compact inbox cards, onboarding flow, VAPI fallbacks"
git push


# NEW SHIT

git branch --set-upstream-to=origin/main main
git pull origin main --rebase
git push