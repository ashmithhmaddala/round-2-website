# Deployment Guide - Render (Backend) + Vercel (Frontend)

## Backend Deployment on Render

### 1. Create a new Web Service on Render
- Go to https://render.com
- Click "New +" → "Web Service"
- Connect your GitHub repository

### 2. Configure the Web Service

**Build Settings:**
- **Root Directory:** `server`
- **Build Command:** `npm install`
- **Start Command:** `node server.js`
- **Environment:** `Node`

### 3. Add Environment Variables on Render

Go to your service → Environment tab and add:

```
NODE_ENV=production
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key_here
ADMIN_SECRET=your_admin_secret_here
ADMIN_INITIAL_USERNAME=admin
ADMIN_INITIAL_PASSWORD=your_secure_admin_password
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_specific_password
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=https://your-render-app.onrender.com/api/auth/google/callback
PORT=5000
```

### 4. Note Your Render URL
After deployment, your backend will be at: `https://your-app-name.onrender.com`

---

## Frontend Deployment on Vercel

### 1. Add Environment Variable on Vercel

Go to your Vercel project → Settings → Environment Variables and add:

```
VITE_API_URL=https://your-render-app.onrender.com/api
```

**IMPORTANT:** Replace `your-render-app` with your actual Render app name.

### 2. Deploy to Vercel

```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Deploy
vercel --prod
```

Or simply push to your GitHub repository - Vercel will auto-deploy.

---

## Update CORS on Backend

After deploying to Vercel, you'll get a URL like:
`https://your-frontend.vercel.app`

The backend already allows all `.vercel.app` domains, so you're good!

If you have a custom domain, add it to the `allowedOrigins` array in `server/server.js`:

```javascript
const allowedOrigins = [
  'https://your-custom-domain.com',
  'https://www.your-custom-domain.com',
  // ... existing origins
];
```

---

## Verify Deployment

1. **Test Backend:** Visit `https://your-render-app.onrender.com/api/uploads/list` 
   - Should return `{"files":[],"uploadDir":"..."}`

2. **Test Frontend:** Visit your Vercel URL and try:
   - Login/Signup
   - Creating a team
   - Viewing challenges
   - Uploading/downloading files

3. **Check Browser Console:** Look for the "File download URL" log to verify correct API URL

---

## Troubleshooting

### Files not downloading on production:

1. Check Render logs for file upload confirmation
2. Verify `VITE_API_URL` environment variable on Vercel includes `/api`
3. Visit `/api/uploads/list` to see uploaded files
4. Ensure Render persistent disk is configured (if needed for file storage)

### CORS errors:

1. Add your Vercel URL to `allowedOrigins` if it's not a `.vercel.app` domain
2. Check browser console for the exact blocked origin
3. Restart Render service after CORS changes

### MongoDB connection issues:

1. Whitelist Render's IP (or use 0.0.0.0/0 for all IPs) in MongoDB Atlas
2. Verify `MONGODB_URI` format: `mongodb+srv://username:password@cluster.mongodb.net/dbname`

---

## Important Notes

- **Render Free Tier:** Spins down after 15 min of inactivity. First request may be slow.
- **File Storage:** Render's free tier has ephemeral storage. Files are deleted on redeploy. Consider using:
  - AWS S3
  - Cloudinary
  - MongoDB GridFS (already partially implemented)
  
- **Environment Variables:** Never commit `.env` files. Always use platform-specific env var settings.
