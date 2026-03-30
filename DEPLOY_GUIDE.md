# CoolBoi_2007 v3 Deployment Guide

This guide will help you deploy CoolBoi_2007 to the cloud using Render (backend) and Vercel (frontend).

---

## Step 1: Push Code to GitHub

1. Create a new GitHub repository named `coolboi_2007`
2. Push your code to GitHub:

```bash
git init
git add .
git commit -m "Initial commit for deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/coolboi_2007.git
git push -u origin main
```

---

## Step 2: Deploy Backend to Render

1. Go to [https://render.com](https://render.com) and sign up/login
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account and select the `coolboi_2007` repository
4. Configure the service:
   - **Name**: `coolboi-backend`
   - **Region**: Choose closest to you
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port 10000`
   - **Plan**: Select **Free**

5. Add Environment Variables (under "Environment" section):
   - `GROQ_API_KEY` = your Groq API key (from https://console.groq.com/keys)
   - `MODEL_NAME` = `llama-3.3-70b-versatile`
   - `ALLOWED_ORIGINS` = `https://YOUR_VERCEL_URL.vercel.app` (add this later after Vercel deploy)
   - `PYTHON_VERSION` = `3.12`

6. Click **"Create Web Service"**

7. Wait for deployment to complete (~2-3 minutes)

8. Note your backend URL: `https://coolboi-backend.onrender.com`

---

## Step 3: Deploy Frontend to Vercel

1. Go to [https://vercel.com](https://vercel.com) and sign up/login with GitHub
2. Click **"Add New..."** → **"Project"**
3. Import the `coolboi_2007` repository
4. Configure the project:
   - **Framework Preset**: `Other`
   - **Root Directory**: `./` (or `frontend`)
   - **Build Command**: Leave empty
   - **Output Directory**: `frontend`

5. Click **"Deploy"**

6. Wait for deployment to complete (~1 minute)

7. Note your frontend URL: `https://coolboi2007.vercel.app` (or custom domain)

---

## Step 4: Update CORS on Render

1. Go back to Render dashboard
2. Select your `coolboi-backend` service
3. Click **"Environment"** tab
4. Update `ALLOWED_ORIGINS` to include your Vercel URL:
   ```
   https://coolboi2007.vercel.app
   ```
5. Click **"Save Changes"**

6. Service will automatically redeploy

---

## Step 5: Update Frontend Config (if needed)

If your backend URL is different, update `frontend/script.js`:

```javascript
const CONFIG = {
    BACKEND_URL: "https://coolboi-backend.onrender.com"  // Your Render URL
};
```

---

## Step 6: Set Up Keep-Alive (Prevent Sleep)

Render's free tier sleeps after 15 minutes of inactivity. To keep it awake:

### Option A: Use cron-job.org (Recommended)

1. Go to [https://cron-job.org](https://cron-job.org) and sign up
2. Click **"CREATE CRONJOB"**
3. Configure:
   - **Title**: `CoolBoi Keep-Alive`
   - **URL**: `https://coolboi-backend.onrender.com/health`
   - **Schedule**: Every 10 minutes
4. Click **"CREATE"**

### Option B: UptimeRobot (Alternative)

1. Go to [https://uptimerobot.com](https://uptimerobot.com)
2. Sign up and add a new monitor:
   - **Monitor Type**: `HTTPS(s)`
   - **Friendly Name**: `CoolBoi Backend`
   - **URL**: `https://coolboi-backend.onrender.com/health`
   - **Interval**: 5 minutes

---

## Testing Your Deployment

1. Open your Vercel URL: `https://coolboi2007.vercel.app`
2. Try sending a message
3. Check the `/health` endpoint: `https://coolboi-backend.onrender.com/health`

---

## Troubleshooting

### CORS Error
- Make sure `ALLOWED_ORIGINS` on Render includes your exact Vercel URL
- Remove trailing slash

### 503 Service Unavailable
- Check Render logs for errors
- Make sure `GROQ_API_KEY` is set correctly

### Response is slow
- This is normal for free tier, Groq has rate limits
- Consider upgrading to paid tier for faster responses

---

## Updating Your Code

1. Push changes to GitHub:
```bash
git add .
git commit -m "Your changes"
git push
```

2. Render will automatically redeploy (if auto-deploy is enabled)

3. Vercel will automatically redeploy (if auto-deploy is enabled)

---

## File Structure After Setup

```
coolboi_2007/
├── backend/
│   ├── main.py              # FastAPI app
│   ├── ai_service.py        # Groq integration
│   ├── commands.py          # Commands handler
│   ├── render.yaml          # Render config
│   ├── requirements.txt     # Python dependencies
│   ├── .env.example         # Env vars template
│   ├── system_prompt.txt    # AI system prompt
│   └── conversation_history.json
├── frontend/
│   ├── index.html           # Main HTML
│   ├── script.js            # Frontend logic
│   └── style.css            # Styles
├── .gitignore
├── DEPLOY_GUIDE.md          # This file
└── run_project.bat          # Local runner
```
