#!/bin/bash

git status          # See what's changed
git add .           # Stage all
git commit -m "ios test 1"
git push


# NEW SHIT

git branch --set-upstream-to=origin/main main
git pull origin main --rebase
git push