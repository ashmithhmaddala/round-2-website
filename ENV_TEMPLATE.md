# Environment Variables Setup Guide

## Server Environment Variables (`server/.env`)

Create a file `server/.env` with the following:

```env
# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ctf-database

# Server Configuration
PORT=5000
NODE_ENV=production

# Email Configuration (Gmail)
# Generate app password: https://myaccount.google.com/apppasswords
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password

# Admin Setup
# Initial super admin password (change after first login!)
ADMIN_PASSWORD=your-very-secure-admin-password-here

# Frontend URL
# Used for email verification and password reset links
FRONTEND_URL=https://your-frontend-domain.com
# For development: http://localhost:5173
```

---

## Frontend Environment Variables (`.env`)

Create a file `.env` in the root directory with:

```env
# Backend API URL
# Production: Your backend server URL
VITE_API_URL=https://your-backend.onrender.com/api

# Development (default if not set):
# VITE_API_URL=http://localhost:5000/api
```

---

## Setting Up on Render (Backend)

1. Go to your Render service dashboard
2. Click **Environment** in the left sidebar
3. Add each variable:
   - Key: `MONGODB_URI`
   - Value: Your MongoDB connection string
   - (Repeat for all variables above)
4. Click **Save Changes**
5. Service will auto-redeploy

---

## Setting Up on Vercel (Frontend)

1. Go to your Vercel project
2. Click **Settings** → **Environment Variables**
3. Add:
   - Name: `VITE_API_URL`
   - Value: `https://your-backend.onrender.com/api`
4. Select environment: **Production**, **Preview**, **Development**
5. Click **Save**
6. Redeploy your site

---

## Security Best Practices

✅ **DO:**
- Use strong passwords (16+ characters)
- Keep .env files in .gitignore
- Rotate credentials regularly
- Use different passwords for dev/prod

❌ **DON'T:**
- Commit .env files to git
- Share credentials in chat/email
- Use default passwords in production
- Reuse passwords across services

---

## Gmail App Password Setup

1. Go to: https://myaccount.google.com/apppasswords
2. Sign in to your Google account
3. Select **App**: Mail
4. Select **Device**: Other (Custom name) → "CTF Platform"
5. Click **Generate**
6. Copy the 16-character password
7. Use this in `EMAIL_PASS` environment variable

**Note:** You need 2-factor authentication enabled on your Google account to use app passwords.

---

## MongoDB Atlas Setup

1. Go to: https://cloud.mongodb.com/
2. Create a new cluster (free tier available)
3. Create database: `ctf-database`
4. Create database user with password
5. Whitelist IP: `0.0.0.0/0` (allow all) or your server's IP
6. Get connection string from **Connect** → **Connect your application**
7. Replace `<password>` and `<dbname>` in connection string
8. Use this in `MONGODB_URI`

---

## Testing Environment Variables

### Server Test:
```bash
cd server
node -e "require('dotenv').config(); console.log('PORT:', process.env.PORT, 'MongoDB:', process.env.MONGODB_URI ? 'Connected' : 'Missing')"
```

### Frontend Test:
```bash
npm run dev
# Check browser console: console.log(import.meta.env.VITE_API_URL)
```

---

## Troubleshooting

### "Cannot find module 'dotenv'"
```bash
cd server
npm install
```

### "VITE_API_URL is undefined"
- Make sure variable starts with `VITE_`
- Restart dev server after changing .env
- Check file is named exactly `.env`

### Emails not sending
- Check Gmail app password is correct
- Check 2FA is enabled on Google account
- Check email/password have no typos
- Check Gmail hasn't blocked the app

### MongoDB connection fails
- Check connection string format
- Check network access allows your IP
- Check database user credentials
- Check database name matches

