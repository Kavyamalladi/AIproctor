# 🚀 Deploying AI LMS with Proctoring System to Render

## ⚠️ IMPORTANT: Read This First!

### Can This Project Be Deployed on Render?
**✅ YES**, but with important considerations:

### Will the Proctoring System Work?
**✅ YES**, but with **performance limitations** on Render's free tier:
- ❌ **No GPU** - YOLO detection will be slower (30-50ms vs 5-10ms with GPU)
- ⚠️ **Limited Memory** - Free tier has 512MB RAM, Python YOLO uses ~800MB
- ⚠️ **Cold Starts** - Services sleep after 15 mins inactivity (can cause 30-60s delays)
- ⚠️ **CPU Only** - Frame analysis takes 2-3 seconds instead of 500ms

### Recommended Plan for Production
For reliable proctoring during live exams, upgrade to:
- **Backend**: Starter Plan ($7/month) - 512MB RAM, no cold starts
- **YOLO Service**: Starter Plan ($7/month) - 512MB RAM (or better: Standard $15/month for 1GB RAM)
- **Frontend**: Free (static site, no issues)

---

## 📦 Deployment Architecture

Your app requires **3 separate Render services**:

```
┌─────────────────┐
│   Frontend      │  Static Site (React build)
│ (Port: Auto)    │  → Talks to Backend API
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   Backend       │  Web Service (Node.js + Express)
│ (Port: 8000)    │  → Talks to YOLO Service
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  YOLO Service   │  Web Service (Python Flask)
│ (Port: 5001)    │  → AI Proctoring Detection
└─────────────────┘
```

---

## 🔧 Step-by-Step Deployment Guide

### Prerequisites
1. **GitHub Account** with this repository
2. **Render Account** (free at render.com)
3. **MongoDB Atlas** account (for database)
4. **Cloudinary** account (for file storage)
5. **Razorpay** account (for payments)
6. **Gmail** with App Password (for emails)

---

### Step 1: Prepare MongoDB Database

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create a database user
4. Get connection string (replace `<password>`)
5. Whitelist all IPs (0.0.0.0/0) for Render access

---

### Step 2: Deploy Python YOLO Service FIRST

**Why first?** Other services need its URL

1. **Go to Render Dashboard** → New → Web Service
2. **Connect GitHub** repository
3. **Configure Service**:
   ```
   Name: ai-lms-yolo-proctoring
   Region: Oregon (or closest to you)
   Branch: main
   Runtime: Python 3
   Build Command: cd backend/ai_proctoring && pip install -r requirements.txt
   Start Command: cd backend/ai_proctoring && gunicorn --bind 0.0.0.0:$PORT yolo_detector:app
   ```
4. **Instance Type**: 
   - Free (testing only - will be slow)
   - Starter ($7/month - minimum for production)
   - Standard ($15/month - recommended for smooth proctoring)

5. **Environment Variables**: (none needed for YOLO service)

6. **Click "Create Web Service"**
7. **Wait 10-15 minutes** for first build (downloads YOLO model)
8. **Copy the service URL** (e.g., `https://ai-lms-yolo-proctoring.onrender.com`)

**⚠️ CRITICAL:** Edit `backend/ai_proctoring/yolo_detector.py` line 286:
```python
# Change from app.run() to use gunicorn in production
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5001)), debug=False)
```

---

### Step 3: Deploy Node.js Backend

1. **Go to Render Dashboard** → New → Web Service
2. **Connect same GitHub** repository
3. **Configure Service**:
   ```
   Name: ai-lms-backend
   Region: Oregon
   Branch: main
   Runtime: Node
   Build Command: cd backend && npm install
   Start Command: cd backend && node index.js
   ```
4. **Instance Type**: Starter ($7/month recommended)

5. **Environment Variables** (Critical - Add these):
   ```
   NODE_ENV = production
   PORT = 8000
   MONGODB_URI = <your MongoDB connection string>
   JWT_SECRET = <generate random 64-character string>
   
   # Email (Gmail App Password)
   EMAIL = your.email@gmail.com
   EMAIL_PASS = your_16_character_app_password
   
   # Razorpay
   RAZORPAY_KEY_ID = rzp_test_xxxxxxxxxxxxx
   RAZORPAY_SECRET = your_razorpay_secret
   
   # Cloudinary
   CLOUDINARY_NAME = your_cloudinary_name
   CLOUDINARY_API_KEY = your_cloudinary_key
   CLOUDINARY_API_SECRET = your_cloudinary_secret
   
   # Frontend URL (will add after deploying frontend)
   FRONTEND_URL = https://your-frontend.onrender.com
   
   # YOLO Service URL (from Step 2)
   YOLO_SERVICE_URL = https://ai-lms-yolo-proctoring.onrender.com
   ```

6. **Click "Create Web Service"**
7. **Wait for deployment** (~5 minutes)
8. **Copy the backend URL** (e.g., `https://ai-lms-backend.onrender.com`)

---

### Step 4: Deploy React Frontend

1. **Go to Render Dashboard** → New → Static Site
2. **Connect same GitHub** repository
3. **Configure Service**:
   ```
   Name: ai-lms-frontend
   Region: Oregon
   Branch: main
   Build Command: cd frontend && npm install && npm run build
   Publish Directory: frontend/dist
   ```

4. **Environment Variables**:
   ```
   VITE_API_URL = https://ai-lms-backend.onrender.com
   VITE_RAZORPAY_KEY_ID = rzp_test_xxxxxxxxxxxxx
   ```

5. **Redirects/Rewrites** (for React Router):
   ```
   Source: /*
   Destination: /index.html
   Action: Rewrite
   ```

6. **Click "Create Static Site"**
7. **Wait for deployment** (~3-5 minutes)
8. **Copy frontend URL** (e.g., `https://ai-lms-frontend.onrender.com`)

---

### Step 5: Update Backend with Frontend URL

1. Go back to **Backend service** on Render
2. Add/Update environment variable:
   ```
   FRONTEND_URL = https://ai-lms-frontend.onrender.com
   ```
3. **Save** (will trigger automatic redeploy)

---

## ✅ Post-Deployment Checklist

### Test Each Service

1. **YOLO Service Health Check**:
   ```bash
   curl https://ai-lms-yolo-proctoring.onrender.com/health
   ```
   Expected: `{"status": "healthy", "model_loaded": true}`

2. **Backend Health Check**:
   ```bash
   curl https://ai-lms-backend.onrender.com/
   ```

3. **Frontend**: Visit your frontend URL in browser

### Test Core Features

- [ ] User registration/login
- [ ] Browse courses
- [ ] Purchase course (test mode payment)
- [ ] Start exam
- [ ] **Proctoring camera activates**
- [ ] **YOLO detections work** (hold phone, test face detection)
- [ ] **Tab switching blocked**
- [ ] Exam submission
- [ ] Email notifications received

---

## 🐛 Common Issues & Solutions

### Issue 1: "Cannot connect to backend"
**Cause**: Frontend using wrong API URL
**Fix**: Check `VITE_API_URL` in frontend environment variables

### Issue 2: "YOLO service is down"
**Cause**: YOLO service sleeping (free tier) or crashed
**Fix**: 
- Visit YOLO URL to wake it: `https://your-yolo-service.onrender.com/health`
- Check YOLO service logs on Render dashboard
- Consider upgrading to paid plan

### Issue 3: "Memory quota exceeded" (YOLO service)
**Cause**: Free tier 512MB not enough for YOLO + OpenCV
**Fix**: **Upgrade to Starter plan minimum** ($7/month, 512MB) or Standard ($15/month, 1GB)

### Issue 4: Proctoring very slow (5-10 seconds per frame)
**Cause**: CPU-only processing on free tier
**Fix**: 
- Upgrade to larger instance
- Increase frame interval in frontend (3-5 seconds)
- Use lighter YOLO model (already using yolov8n - nano)

### Issue 5: CORS errors
**Cause**: Backend CORS not configured for frontend URL
**Fix**: Check `FRONTEND_URL` in backend env vars matches your actual frontend URL

### Issue 6: "Build failed" for YOLO service
**Cause**: Python dependencies too large or timeout
**Fix**: 
- Increase build timeout in Render settings
- If still fails, remove `opencv-contrib-python` from requirements (keeps `opencv-python`)

### Issue 7: Cold starts causing exam delays
**Cause**: Free tier services sleep after 15 minutes
**Fix**: 
- **Critical for exams**: Upgrade to Starter plan (no cold starts)
- Or: Use render-cron to ping services every 10 minutes (free workaround)

---

## 💰 Cost Summary

### Free Tier (Testing Only)
- Frontend: Free ✅
- Backend: Free (750 hours/month, sleeps after 15 mins) ⚠️
- YOLO: Free (750 hours/month, **will be very slow**) ❌
- **Total: $0/month**
- **Not recommended for production exams**

### Recommended Production Setup
- Frontend: Free ✅
- Backend: Starter ($7/month) ✅
- YOLO: Standard ($15/month) ✅ (1GB RAM for better performance)
- **Total: $22/month**
- **Suitable for live exams with students**

---

## 🚀 Performance Optimization Tips

1. **Use CDN for Frontend** - Cloudflare for faster global access
2. **Database Indexing** - Add indexes to MongoDB collections
3. **Image Optimization** - Compress proctoring screenshots before upload
4. **Increase Frame Interval** - Change from 2s to 3-5s for less load
5. **Caching** - Use Redis for session/token caching (optional)
6. **Monitor Logs** - Set up log monitoring on Render dashboard

---

## 📊 Expected Performance

### Free Tier
- Backend response: 100-300ms (good)
- YOLO detection: **3-10 seconds** per frame ❌
- Cold start: 30-60 seconds ⚠️
- Uptime: ~85% (services sleep frequently)

### Paid Tier (Starter + Standard)
- Backend response: 50-150ms (excellent)
- YOLO detection: **1-3 seconds** per frame ✅
- Cold start: None ✅
- Uptime: 99.9%+ ✅

---

## 🔐 Security Checklist

- [ ] Change all default secrets (JWT_SECRET, etc.)
- [ ] Use environment variables (never commit .env)
- [ ] Enable HTTPS only (Render does this automatically)
- [ ] Restrict MongoDB IP whitelist after testing
- [ ] Use Razorpay test mode until ready for live payments
- [ ] Review CORS settings in backend
- [ ] Enable rate limiting (optional but recommended)

---

## 📖 Additional Resources

- [Render Documentation](https://render.com/docs)
- [MongoDB Atlas Setup](https://www.mongodb.com/docs/atlas/)
- [Cloudinary Setup](https://cloudinary.com/documentation)
- [Razorpay Integration](https://razorpay.com/docs/)
- [Gmail App Passwords](https://support.google.com/accounts/answer/185833)

---

## 💡 Alternative Deployment Options

If Render doesn't work well:

1. **Railway.app** - Similar to Render, better for monorepos
2. **Vercel** (frontend) + **Railway** (backends) - Fast CDN for frontend
3. **DigitalOcean App Platform** - More control, similar pricing
4. **AWS/Azure** - More complex but better performance
5. **Self-hosted VPS** - Cheapest for high-traffic apps

---

## 🎓 Final Recommendations

### For Development/Testing
✅ Use **Free Tier** on Render - Good enough to test features

### For Student Projects/Demos
✅ Use **Frontend Free + Backend Starter ($7/month)** - Skip YOLO or accept slow performance

### For Production (Real Exams with Students)
✅✅✅ **REQUIRED**: Frontend Free + Backend Starter + YOLO Standard = **$22/month**
- No cold starts during exams
- Reliable proctoring detection
- Better student experience

---

## 🙋 Need Help?

If you encounter deployment issues:
1. Check Render service logs (Dashboard → Your Service → Logs)
2. Test each service independently (health checks)
3. Verify all environment variables are set correctly
4. Check if YOLO service is awake (visit /health endpoint)

**Pro Tip**: Deploy on a weekend when you have time to troubleshoot! First deployment takes 30-60 minutes to set up properly.

---

## ✨ Success Indicator

Your deployment is successful when:
- ✅ You can register/login on frontend
- ✅ You can browse and purchase courses
- ✅ Exams load with camera feed
- ✅ YOLO detections appear in console
- ✅ Tab switching is blocked
- ✅ Violations are recorded
- ✅ Email confirmations arrive

**Good luck with your deployment! 🚀**
