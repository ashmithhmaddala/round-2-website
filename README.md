# OSINT & Cryptography CTF Platform

A professional Capture The Flag (CTF) platform built with React, Express.js, and MongoDB Atlas. Features team management, real-time scoring, admin dashboard with analytics, and modern UI design.

## Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Tech Stack

- **Frontend**: React 18 + Vite
- **Routing**: React Router DOM
- **Icons**: React Icons (replaces Font Awesome)
- **Charts**: Chart.js + React-Chartjs-2
- **Storage**: LocalStorage (client-side)
- **Styling**: CSS3 with CSS Variables

## Deployment Options

### Option 1: Vercel (Recommended - Easiest)

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Vercel auto-detects Vite config
6. Click "Deploy"
7. Done!

**One-command deploy:**
```bash
npm install -g vercel
vercel
```

### Option 2: Netlify

1. Build the project: `npm run build`
2. Go to [netlify.com](https://netlify.com)
3. Drag & drop the `dist` folder
4. Done!

**Or use Netlify CLI:**
```bash
npm install -g netlify-cli
npm run build
netlify deploy --prod
```

### Option 3: GitHub Pages

```bash
# Install gh-pages
npm install --save-dev gh-pages

# Add to package.json scripts:
"scripts": {
  "deploy": "npm run build && gh-pages -d dist"
}

# Deploy
npm run deploy
```

## Features

### User Features
- Sign up / Login authentication
- Create or join teams with 6-digit codes
- Browse OSINT & Cryptography challenges
- Submit flags and earn points
- Team leaderboard and statistics
- Real-time score updates

### Admin Features
Admin dashboard (set your own secure password)
- View all teams and players
- Create, edit, delete challenges
- Analytics with Chart.js visualizations
- Team management (delete teams)

## Admin Access

- **URL**: `/admin`
**Password**: (set in backend or via environment variable; never use default passwords)

## Project Structure

```
src/
├── pages/
│   ├── Login.jsx          # Authentication page
│   ├── Dashboard.jsx      # Team management
│   ├── Challenges.jsx     # Challenge solving
│   └── Admin.jsx          # Admin dashboard
├── utils/
│   └── auth.js            # Authentication & storage utilities
├── App.jsx                # Main app with routing
├── main.jsx               # React entry point
├── index.css              # Main styles
└── admin.css              # Admin-specific styles
```

## React Icons Used

- `FaShieldAlt` - Logo/Security
- `FaUsers` - Create Team
- `FaUserPlus` - Join Team
- `FaCopy` - Copy button
- `FaRocket` - Start Challenges
- `FaMagnifyingGlass` - OSINT category
- `FaLock` - Cryptography category
- `FaChartLine` - Analytics
- And more...

## Configuration

### Change Admin Password
Edit `src/pages/Admin.jsx`:
```javascript
const ADMIN_PASSWORD = 'your-secure-password'
```

### Add More Challenges
Use the Admin Dashboard or edit `src/utils/auth.js` in `getDefaultChallenges()`

## Production Deployment Checklist

- [ ] Change admin password
- [ ] Test all features
- [ ] Build: `npm run build`
- [ ] Deploy to Vercel/Netlify
- [ ] Test deployed site
- [ ] Share with users!

## Browser Storage

Data is stored in `localStorage`:
- `users` - User accounts
- `teams` - Team data
- `challenges` - Challenge definitions
- `currentUser` - Logged-in user
- `adminAuth` - Admin session (sessionStorage)

## Migrating to Backend (Future)

To use MongoDB Atlas:
1. Create backend API (Express.js)
2. Replace `localStorage` calls with API calls
3. Deploy backend to Vercel/Render
4. Update frontend to use API endpoints

## License

MIT - Free to use for educational purposes

## Contributing

Pull requests welcome! Please test before submitting.

---

**Built with Vite + React**
