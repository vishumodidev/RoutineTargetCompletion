# Habit Hero - Netlify Deployment Guide

This document describes how to deploy the **Habit Hero** application to production using Netlify, and connect it to your serverless Google Sheets database.

---

## 1. Prerequisites
1. A **GitHub**, **GitLab**, or **Bitbucket** repository containing your code.
2. A **Netlify** account (free tier is perfect).
3. Your Google Apps Script Web App URL (obtained from deploying the `backend/Code.js` script to your Google Sheet editor).

---

## 2. Step-by-Step Deployment Instructions

### Step A: Push Code to Git Repository
Commit all files in this workspace and push them to your repository (e.g. GitHub):
```bash
git init
git add .
git commit -m "feat: initial Habit Hero release"
git remote add origin YOUR_REPOSITORY_URL
git branch -M main
git push -u origin main
```

### Step B: Connect to Netlify
1. Log into your **Netlify Dashboard**.
2. Click **Add new site** -> **Import an existing project**.
3. Choose your Git provider (e.g., GitHub) and select your `DailyTracker` repository.

### Step C: Configure Build Settings
Configure the build parameters exactly as follows:
- **Branch to deploy**: `main`
- **Build command**: `npm run build`
- **Publish directory**: `dist`

### Step D: Add Environment Variables
1. Scroll down to **Environment variables** (or go to **Site settings** -> **Environment variables** after creating the site).
2. Add a new variable:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://script.google.com/macros/s/.../exec` (your live Google Apps Script Web App URL)
3. Click **Deploy site**.

---

## 3. SPA Routing & Client-side Redirects
Because Habit Hero uses client-side routing (`react-router-dom`), we have configured two redirect mechanisms in this build:
1. `netlify.toml` in the project root.
2. `public/_redirects` which copies into the root of the output `dist` bundle.

This guarantees that sub-routes like `/habits` or `/analytics` will resolve to `index.html` and let the client-side router handle the rendering instead of returning a generic Netlify `404 Not Found` error upon browser refreshes.

---

## 4. Verification Check
After Netlify builds the site, open the generated URL:
1. Try going directly to `/login`.
2. Open Chrome Developer Tools (F12) -> **Network tab** to verify that Axios requests are pointed to your Google Sheet macro URL.
