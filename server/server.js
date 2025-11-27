import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import multer from 'multer';
import { GridFSBucket } from 'mongodb';
import path from 'path';
import { fileURLToPath } from 'url';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import User from './models/User.js';
import Team from './models/Team.js';
import Challenge from './models/Challenge.js';
import Admin from './models/Admin.js';
import Solve from './models/Solve.js';
import Announcement from './models/Announcement.js';
import Competition from './models/Competition.js';
import Log from './models/Log.js';
import EmailQueue from './models/EmailQueue.js';
import { startEmailWorker } from './utils/emailWorker.js';

dotenv.config();

console.log('🚀 Starting server initialization...');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      
      // Allow any Vercel deployment
      if (origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }
      
      const allowedOrigins = [
        'https://nhceosintcrypto.online',
        'https://www.nhceosintcrypto.online',
        'http://nhceosintcrypto.online',
        'http://www.nhceosintcrypto.online',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175'
      ];
      
      if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true
  }
});

app.set('trust proxy', 1); // Trust first proxy (required for Vercel/Heroku to get real IP)
const PORT = process.env.PORT || 5000;
console.log(`ℹ️ Configured PORT: ${PORT}`);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production-' + crypto.randomBytes(32).toString('hex');
const JWT_EXPIRES_IN = '8h'; // Admin session expires after 8 hours
const MAX_TEAM_SIZE = 3; // Maximum members per team

// Socket.io connection handling with authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  // Allow connection even without token (for public users)
  // We'll send different events based on user type
  if (!token) {
    socket.isAdmin = false;
    socket.isUser = true;
    return next();
  }
  
  // Verify JWT token for authenticated users/admins
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.userId;
    socket.username = decoded.username;
    socket.isAdmin = decoded.isAdmin || false;
    socket.isUser = !decoded.isAdmin;
    next();
  } catch (error) {
    // Token invalid but still allow connection as public user
    socket.isAdmin = false;
    socket.isUser = true;
    next();
  }
});

io.on('connection', (socket) => {
  // Only log in development
  if (process.env.NODE_ENV !== 'production') {
    console.log('✅ Client connected:', socket.id, socket.isAdmin ? '(Admin)' : '(User)');
  }
  
  socket.on('disconnect', () => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('❌ Client disconnected:', socket.id);
    }
  });
});

// Export io for use in routes
export { io };

// Helper function for logging
const logAction = async (action, actor, role, details, req) => {
  try {
    let ipAddress = 'SYSTEM';
    if (req) {
      // Get real IP even behind proxy (Vercel/Nginx)
      const forwarded = req.headers['x-forwarded-for'];
      if (forwarded) {
        // x-forwarded-for can be "client, proxy1, proxy2" - we want the first one
        ipAddress = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : forwarded[0];
      } else {
        ipAddress = req.socket.remoteAddress || req.ip;
      }
      
      // Clean up IPv6 localhost
      if (ipAddress === '::1') ipAddress = '127.0.0.1';
    }

    // Use admin username from header if available and actor is generic 'admin'
    let finalActor = actor;
    if (req && actor === 'admin' && req.headers['x-admin-username']) {
      finalActor = req.headers['x-admin-username'];
    }

    await Log.create({
      action,
      actor: finalActor,
      role,
      details,
      ipAddress
    });
  } catch (error) {
    // Silently fail logging to prevent infinite loops
    if (process.env.NODE_ENV !== 'production') {
      console.error('Logging failed:', error);
    }
  }
};

// GridFS bucket - will be initialized after MongoDB connection
let gfsBucket;

// Middleware
const allowedOrigins = [
  'https://round-2-website-bqpdjjm7d-ashmithhmaddalas-projects.vercel.app',
  'https://round-2-website-9s311brt4-ashmithhmaddalas-projects.vercel.app',
  'https://nhceosintcrypto.online',
  'https://www.nhceosintcrypto.online',
  'http://nhceosintcrypto.online',
  'http://www.nhceosintcrypto.online',
  'https://api.nhceosintcrypto.online',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5000'
];
app.use(helmet({
  crossOriginResourcePolicy: false // allow CORS with helmet
}));
app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Allow any Vercel deployment
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }

    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' })); // Prevent huge payloads
app.use(cookieParser()); // Parse cookies for JWT
app.use(passport.initialize());

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  if (req.body) {
    // Remove any MongoDB operators from input
    const sanitize = (obj) => {
      if (typeof obj !== 'object' || obj === null) return obj;
      
      const cleaned = {};
      for (const [key, value] of Object.entries(obj)) {
        // Remove keys starting with $ (MongoDB operators)
        if (key.startsWith('$')) {
          continue;
        }
        
        // Recursively sanitize nested objects
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          cleaned[key] = sanitize(value);
        } else {
          cleaned[key] = value;
        }
      }
      return cleaned;
    };
    
    req.body = sanitize(req.body);
  }
  next();
};

app.use(sanitizeInput);

// Rate limiting
const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // limit each IP to 5 requests per windowMs
  message: { error: 'Too many login attempts, please try again later.' }
});
const flagLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 flag submissions per windowMs
  message: { error: 'Too many flag submissions, please try again later.' }
});
const passwordResetLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 1, // limit each IP to 1 request per windowMs
  message: { error: 'Too many password reset requests, please try again after 30 minutes.' }
});

app.use('/api/auth/login', loginLimiter);
app.use('/api/challenges/submit', flagLimiter);
app.use('/api/auth/forgot-password', passwordResetLimiter);
app.use('/api/auth/forgot-admin-password', passwordResetLimiter);

// ==================== MIDDLEWARE ====================

// Admin Authentication Middleware using JWT
const authenticateAdmin = async (req, res, next) => {
  try {
    // Check for JWT token in Authorization header or cookie
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies.adminToken;
    
    if (!token) {
      await logAction('ADMIN_ACCESS_DENIED', 'unknown', 'admin', 'No JWT token provided', req);
      return res.status(401).json({ error: 'Admin authentication required' });
    }
    
    // Verify JWT token
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Token is valid, get admin from database
      const admin = await Admin.findById(decoded.adminId);
      if (!admin) {
        await logAction('ADMIN_ACCESS_DENIED', decoded.username, 'admin', 'Admin not found for valid token', req);
        return res.status(401).json({ error: 'Invalid admin credentials' });
      }
      
      // Attach admin info to request
      req.admin = admin;
      req.adminId = admin._id;
      next();
    } catch (jwtError) {
      await logAction('ADMIN_ACCESS_DENIED', 'unknown', 'admin', `Invalid JWT token: ${jwtError.message}`, req);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Admin authentication error:', error);
    }
    res.status(500).json({ error: 'Authentication error' });
  }
};

// Super Admin Only Middleware
const requireSuperAdmin = async (req, res, next) => {
  try {
    if (!req.admin) {
      return res.status(401).json({ error: 'Admin authentication required' });
    }
    
    if (req.admin.role !== 'super_admin') {
      await logAction('SUPER_ADMIN_ACCESS_DENIED', req.admin.username, 'admin', 'Attempted super admin action without permission', req);
      return res.status(403).json({ error: 'Super admin access required' });
    }
    
    next();
  } catch (error) {
    console.error('Super admin check error:', error);
    res.status(500).json({ error: 'Authorization error' });
  }
};

// Passport Config - will be initialized after MongoDB connects
let isGoogleAuthConfigured = false;

// Google Auth Routes
app.get('/api/auth/google', (req, res, next) => {
  if (!isGoogleAuthConfigured) {
    return res.status(503).json({ error: 'Google Authentication is not configured or MongoDB is not connected yet.' });
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

app.get('/api/auth/google/callback', 
  (req, res, next) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    if (!isGoogleAuthConfigured) {
      return res.redirect(`${frontendUrl}/login?error=GoogleAuthNotConfigured`);
    }
    passport.authenticate('google', { session: false, failureRedirect: `${frontendUrl}/login` }, (err, user, info) => {
      if (err) {
        console.error('Passport Auth Error:', err);
        return res.redirect(`${frontendUrl}/login?error=AuthFailed`);
      }
      if (!user) {
        console.error('Passport Auth Failed: No user returned');
        return res.redirect(`${frontendUrl}/login?error=AuthFailed`);
      }
      req.user = user;
      next();
    })(req, res, next);
  },
  (req, res) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    try {
      // Generate JWT
      const token = jwt.sign(
        { userId: req.user._id, username: req.user.username, isAdmin: false },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Redirect to frontend
      // If profile is not complete, redirect to completion page
      if (!req.user.isProfileComplete) {
        return res.redirect(`${frontendUrl}/complete-profile?token=${token}`);
      }

      // If user already has a team, go straight to dashboard
      if (req.user.teamId) {
        return res.redirect(`${frontendUrl}/dashboard?token=${token}`);
      }

      // No team yet, still go to dashboard where they can create/join
      res.redirect(`${frontendUrl}/dashboard?token=${token}`);
    } catch (error) {
      console.error('Callback Error:', error);
      res.redirect(`${frontendUrl}/login?error=CallbackFailed`);
    }
  }
);

// Complete Profile Endpoint
app.post('/api/auth/complete-profile', async (req, res) => {
  try {
    const { username, token } = req.body;
    
    if (!token) return res.status(401).json({ error: 'No token provided' });
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Check if username is taken
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already taken' });
    }
    
    user.username = username;
    user.isProfileComplete = true;
    await user.save();
    
    // Generate new token with updated username
    const newToken = jwt.sign(
      { userId: user._id, username: user.username, isAdmin: false },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({ success: true, token: newToken, username: user.username });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ADMIN AUTH ROUTES ====================

// Admin Login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const admin = await Admin.findOne({ username });
    if (!admin) {
      await logAction('ADMIN_LOGIN_FAILED', username, 'admin', 'Admin not found', req);
      return res.status(401).json({ error: 'Invalid credentials. Access denied.' });
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      await logAction('ADMIN_LOGIN_FAILED', username, 'admin', 'Invalid password', req);
      return res.status(401).json({ error: 'Invalid credentials. Access denied.' });
    }

    const token = jwt.sign(
      { adminId: admin._id, username: admin.username, isAdmin: true, role: admin.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.cookie('adminToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000
    });

    await logAction('ADMIN_LOGIN_SUCCESS', username, 'admin', 'Admin logged in successfully', req);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      admin: {
        username: admin.username,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// Admin Logout
app.post('/api/admin/logout', (req, res) => {
  res.clearCookie('adminToken');
  res.json({ success: true, message: 'Logged out successfully' });
});

// ==================== CHALLENGES ROUTES ====================

// Get all challenges
app.get('/api/challenges', async (req, res) => {
  try {
    const challenges = await Challenge.find().select('-flagHash -flag').lean();
    res.json(challenges);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== AUTH ROUTES ====================

// User Signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword, isVerified: true });
    await user.save();

    await logAction('USER_SIGNUP', username, 'user', 'User registered successfully', req);

    res.status(201).json({ success: true, message: 'Account created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      await logAction('USER_LOGIN_FAILED', username, 'user', 'User not found', req);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      await logAction('USER_LOGIN_FAILED', username, 'user', 'Invalid password', req);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await logAction('USER_LOGIN_SUCCESS', username, 'user', 'User logged in successfully', req);

    res.json({ success: true, message: 'Login successful', user: { username: user.username, teamId: user.teamId } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user info
app.get('/api/auth/user/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== TEAMS ROUTES ====================

// Get all teams
app.get('/api/teams', async (req, res) => {
  try {
    const teams = await Team.find().sort({ score: -1 });
    res.json(teams);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create team
app.post('/api/teams/create', async (req, res) => {
  try {
    const { teamName, username } = req.body;

    if (!teamName || !username) {
      return res.status(400).json({ error: 'Team name and username are required' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.teamId) {
      return res.status(400).json({ error: 'You are already in a team' });
    }

    const teamCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const team = new Team({
      name: teamName,
      code: teamCode,
      members: [username],
      createdBy: username
    });

    await team.save();

    user.teamId = teamCode;
    await user.save();

    await logAction('CREATE_TEAM', username, 'user', `Created team: ${teamName} (${teamCode})`, req);

    res.status(201).json({ success: true, team, teamCode });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Join team
app.post('/api/teams/join', async (req, res) => {
  try {
    const { teamCode, username } = req.body;

    const team = await Team.findOne({ code: teamCode });
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    if (team.members.length >= MAX_TEAM_SIZE) {
      return res.status(400).json({ error: `Team is full (max ${MAX_TEAM_SIZE} members)` });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.teamId) {
      return res.status(400).json({ error: 'You are already in a team' });
    }

    team.members.push(username);
    await team.save();

    user.teamId = teamCode;
    await user.save();

    await logAction('JOIN_TEAM', username, 'user', `Joined team: ${team.name} (${teamCode})`, req);

    res.json({ success: true, team });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get team by code
app.get('/api/teams/:code', async (req, res) => {
  try {
    const team = await Team.findOne({ code: req.params.code });
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    res.json(team);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ADMIN MANAGEMENT ROUTES ====================

// Get all admins
app.get('/api/admin/admins', authenticateAdmin, async (req, res) => {
  try {
    const admins = await Admin.find().select('-password');
    res.json({ admins });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users
app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== COMPETITION ROUTES ====================

// Get competition (public)
app.get('/api/competition', async (req, res) => {
  try {
    let competition = await Competition.findOne();
    if (!competition) {
      competition = new Competition({
        name: 'Cache Me If You Can',
        startTime: new Date(),
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: 'upcoming'
      });
      await competition.save();
    }
    res.json(competition);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get competition (admin)
app.get('/api/admin/competition', authenticateAdmin, async (req, res) => {
  try {
    let competition = await Competition.findOne();
    if (!competition) {
      competition = new Competition({
        name: 'Cache Me If You Can',
        startTime: new Date(),
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: 'upcoming'
      });
      await competition.save();
    }
    res.json(competition);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update competition
app.put('/api/admin/competition', authenticateAdmin, async (req, res) => {
  try {
    const { name, startTime, endTime, status } = req.body;
    let competition = await Competition.findOne();
    
    if (!competition) {
      competition = new Competition({ name, startTime, endTime, status });
    } else {
      if (name) competition.name = name;
      if (startTime) competition.startTime = startTime;
      if (endTime) competition.endTime = endTime;
      if (status) competition.status = status;
    }
    
    await competition.save();
    
    await logAction('UPDATE_COMPETITION', req.admin.username, 'admin', `Updated competition settings`, req);
    
    // Emit competition update via socket
    if (io) {
      io.emit('competition:updated', { competition });
      if (status) {
        io.emit('competition:status', { status, competition });
      }
    }
    
    res.json(competition);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ANNOUNCEMENTS ROUTES ====================

// Get all announcements (public)
app.get('/api/announcements', async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .sort({ pinned: -1, createdAt: -1 })
      .lean();
    res.json({ announcements });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all announcements (admin)
app.get('/api/admin/announcements', authenticateAdmin, async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .sort({ pinned: -1, createdAt: -1 })
      .lean();
    res.json({ announcements });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create announcement
app.post('/api/admin/announcements', authenticateAdmin, async (req, res) => {
  try {
    const { title, message, type, priority, pinned, expiresAt } = req.body;
    
    const announcement = new Announcement({
      title,
      message,
      type: type || 'info',
      priority: priority || 'normal',
      pinned: pinned || false,
      expiresAt: expiresAt || null
    });
    
    await announcement.save();
    await logAction('CREATE_ANNOUNCEMENT', req.admin.username, 'admin', `Created announcement: ${title}`, req);
    
    if (io) {
      io.emit('announcement:created', { announcement });
    }
    
    res.status(201).json({ success: true, announcement });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete announcement
app.delete('/api/admin/announcements/:id', authenticateAdmin, async (req, res) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);
    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    
    await logAction('DELETE_ANNOUNCEMENT', req.admin.username, 'admin', `Deleted announcement: ${announcement.title}`, req);
    
    if (io) {
      io.emit('announcement:deleted', { id: req.params.id });
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== LOGS ROUTES ====================

// Get logs (admin only)
app.get('/api/admin/logs', authenticateAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const logs = await Log.find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Initialize MongoDB connection and Passport
console.log('🔌 Connecting to MongoDB...');
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas');
    
    // Initialize Passport Google Strategy AFTER MongoDB is connected
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      passport.use(new GoogleStrategy({
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: "/api/auth/google/callback",
          proxy: true
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            console.log('Google Auth Profile:', profile.id, profile.emails);
            
            if (!profile.emails || profile.emails.length === 0) {
              console.error('No email found in Google profile');
              return done(new Error('No email found in Google profile'), null);
            }

            const email = profile.emails[0].value;
            let user = await User.findOne({ $or: [{ googleId: profile.id }, { email: email }] });

            if (user) {
              if (!user.googleId) {
                user.googleId = profile.id;
                user.isVerified = true;
                await user.save();
              }
              return done(null, user);
            }

            const tempUsername = `user_${profile.id.slice(0, 8)}`;
            user = await User.create({
              username: tempUsername,
              email: email,
              googleId: profile.id,
              isVerified: true,
              isProfileComplete: false
            });

            return done(null, user);
          } catch (error) {
            console.error('Google Auth Error:', error);
            return done(error, null);
          }
        }
      ));
      isGoogleAuthConfigured = true;
      console.log('✅ Google OAuth configured');
    } else {
      console.warn('⚠️ Google OAuth credentials not found. Google Auth will be disabled.');
    }
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    console.error('💡 Check your MONGODB_URI environment variable');
    process.exit(1);
  });

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔌 Socket.IO ready for real-time connections`);
});

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received, shutting down gracefully...`);
  
  // Stop accepting new connections
  httpServer.close(async () => {
    console.log('✅ HTTP server closed');
    
    // Close Socket.IO connections
    io.close(() => {
      console.log('✅ Socket.IO connections closed');
    });
    
    // Close MongoDB connection
    try {
      await mongoose.connection.close();
      console.log('✅ MongoDB connection closed');
    } catch (error) {
      console.error('❌ Error closing MongoDB:', error);
    }
    
    console.log('👋 Graceful shutdown complete');
    process.exit(0);
  });
  
  // Force shutdown if graceful shutdown takes too long
  setTimeout(() => {
    console.error('❌ Forceful shutdown - graceful shutdown timeout');
    process.exit(1);
  }, 10000); // 10 second timeout
};

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
