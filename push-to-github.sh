#!/usr/bin/env bash
set -e

git init
git add .
git commit -m "Initial PM Tracker"
git branch -M main

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin https://github.com/rizpram/PM.git
else
  git remote add origin https://github.com/rizpram/PM.git
fi

git push -u origin main
