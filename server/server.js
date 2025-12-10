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
import fs from 'fs';
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

// Configure multer for file uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    // Allow all file types for CTF challenges
    cb(null, true);
  }
});

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
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
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

// Serve uploaded files with proper headers
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filePath) => {
    // Critical CORS headers
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Set appropriate content type based on file extension
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.zip': 'application/zip',
      '.7z': 'application/x-7z-compressed',
      '.rar': 'application/x-rar-compressed',
      '.tar': 'application/x-tar',
      '.gz': 'application/gzip',
      '.exe': 'application/octet-stream',
      '.bin': 'application/octet-stream'
    };
    
    if (mimeTypes[ext]) {
      res.setHeader('Content-Type', mimeTypes[ext]);
    } else {
      res.setHeader('Content-Type', 'application/octet-stream');
    }
    
    // Set proper encoding for binary files
    res.setHeader('Content-Transfer-Encoding', 'binary');
    
    // Allow inline viewing for images and PDFs only
    if (['.jpg', '.jpeg', '.png', '.gif', '.pdf'].includes(ext)) {
      res.setHeader('Content-Disposition', 'inline');
    } else {
      // Force download for archives and other files
      const filename = path.basename(filePath);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    }
  }
}));

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
      console.log('Google OAuth Callback - User:', req.user?.username, 'Profile Complete:', req.user?.isProfileComplete);
      
      // Check if user is banned
      if (req.user?.banned) {
        console.log('Banned user attempted Google OAuth login:', req.user.username);
        return res.redirect(`${frontendUrl}/login?error=AccountBanned`);
      }

      // Generate JWT
      const token = jwt.sign(
        { userId: req.user._id, username: req.user.username, isAdmin: false },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      console.log('Generated token for user:', req.user.username, 'Token length:', token.length);

      // If profile is not complete, redirect to completion page
      if (!req.user.isProfileComplete) {
        const redirectUrl = `${frontendUrl}/complete-profile?token=${token}`;
        console.log('Redirecting to complete-profile:', redirectUrl);
        return res.redirect(redirectUrl);
      }

      // If user already has a team, go straight to dashboard
      if (req.user.teamId) {
        const redirectUrl = `${frontendUrl}/dashboard?token=${token}`;
        console.log('Redirecting to dashboard with team:', redirectUrl);
        return res.redirect(redirectUrl);
      }

      // No team yet, still go to dashboard where they can create/join
      const redirectUrl = `${frontendUrl}/dashboard?token=${token}`;
      console.log('Redirecting to dashboard (no team):', redirectUrl);
      res.redirect(redirectUrl);
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
    
    // Check if user is banned
    if (user.banned) {
      return res.status(403).json({ error: 'Your account has been banned. Please contact support.' });
    }
    
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
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' for cross-site, 'lax' for local dev
      path: '/', // Apply cookie to all routes
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
  res.clearCookie('adminToken', {
    path: '/', // Must match the path used when setting the cookie
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  });
  res.json({ success: true, message: 'Logged out successfully' });
});

// ==================== CHALLENGES ROUTES ====================

// Get all challenges
app.get('/api/challenges', async (req, res) => {
  try {
    const challenges = await Challenge.find().select('-flagHash -flag').lean();
    res.json(challenges);
  } catch (error) {
    console.error('Error fetching challenges:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      name: error.name
    });
    res.status(500).json({ error: 'Failed to load challenges: ' + error.message });
  }
});

// Create challenge (admin)
app.post('/api/admin/challenges', authenticateAdmin, async (req, res) => {
  try {
    const { id, title, description, category, difficulty, points, flag } = req.body;
    
    if (!id || !title || !category || !difficulty || !points || !flag) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    const existingChallenge = await Challenge.findOne({ id });
    if (existingChallenge) {
      return res.status(400).json({ error: 'Challenge ID already exists' });
    }
    
    const flagHash = await bcrypt.hash(flag, 10);
    const challenge = new Challenge({
      id,
      title,
      description,
      category,
      difficulty,
      points,
      flagHash,
      visible: true,
      disabled: false
    });
    
    await challenge.save();
    await logAction('CREATE_CHALLENGE', req.admin.username, 'admin', `Created challenge: ${title}`, req);
    
    if (io) {
      io.emit('challenge:created', { challenge: await Challenge.findOne({ id }).select('-flagHash -flag').lean() });
    }
    
    res.status(201).json({ success: true, challenge: await Challenge.findOne({ id }).select('-flagHash -flag').lean() });
  } catch (error) {
    console.error('Create challenge error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update challenge (admin)
app.put('/api/admin/challenges/:id', authenticateAdmin, async (req, res) => {
  try {
    const { title, description, category, difficulty, points, flag } = req.body;
    
    const challenge = await Challenge.findOne({ id: req.params.id });
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }
    
    // Update fields if provided
    if (title !== undefined) challenge.title = title;
    if (description !== undefined) challenge.description = description;
    if (category !== undefined) challenge.category = category;
    if (difficulty !== undefined) challenge.difficulty = difficulty;
    if (points !== undefined) challenge.points = points;
    
    // Only update flag and flagHash if a new flag is provided (and not empty)
    if (flag && flag.trim() !== '') {
      challenge.flagHash = await bcrypt.hash(flag, 10);
    }
    // If flag is not provided or is empty, keep the existing flagHash - don't modify it
    
    // Save with validation - flagHash already exists so validation will pass
    await challenge.save({ validateModifiedOnly: true });
    await logAction('UPDATE_CHALLENGE', req.admin.username, 'admin', `Updated challenge: ${challenge.title}`, req);
    
    if (io) {
      io.emit('challenge:updated', { challenge: await Challenge.findOne({ id: req.params.id }).select('-flagHash -flag').lean() });
    }
    
    res.json({ success: true, challenge: await Challenge.findOne({ id: req.params.id }).select('-flagHash -flag').lean() });
  } catch (error) {
    console.error('Challenge update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete challenge (admin)
app.delete('/api/admin/challenges/:id', authenticateAdmin, async (req, res) => {
  try {
    const challenge = await Challenge.findOneAndDelete({ id: req.params.id });
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }
    
    await logAction('DELETE_CHALLENGE', req.admin.username, 'admin', `Deleted challenge: ${challenge.title}`, req);
    
    if (io) {
      io.emit('challenge:deleted', { id: req.params.id });
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle challenge visibility (admin)
app.patch('/api/admin/challenges/:id/visibility', authenticateAdmin, async (req, res) => {
  try {
    const challenge = await Challenge.findOne({ id: req.params.id });
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }
    
    challenge.visible = !challenge.visible;
    await challenge.save({ validateModifiedOnly: true });
    
    await logAction('TOGGLE_VISIBILITY', req.admin.username, 'admin', `Toggled visibility for: ${challenge.title}`, req);
    
    if (io) {
      io.emit('challenge:visibility', { challenge: await Challenge.findOne({ id: req.params.id }).select('-flagHash -flag').lean() });
    }
    
    res.json({ success: true, challenge: await Challenge.findOne({ id: req.params.id }).select('-flagHash -flag').lean() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle challenge disabled status (admin)
app.patch('/api/admin/challenges/:id/disabled', authenticateAdmin, async (req, res) => {
  try {
    const challenge = await Challenge.findOne({ id: req.params.id });
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }
    
    challenge.disabled = !challenge.disabled;
    await challenge.save({ validateModifiedOnly: true });
    
    await logAction('TOGGLE_DISABLED', req.admin.username, 'admin', `Toggled disabled status for: ${challenge.title}`, req);
    
    if (io) {
      io.emit('challenge:disabled', { challenge: await Challenge.findOne({ id: req.params.id }).select('-flagHash -flag').lean() });
    }
    
    res.json({ success: true, challenge: await Challenge.findOne({ id: req.params.id }).select('-flagHash -flag').lean() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload files to challenge (admin)
app.post('/api/admin/challenges/:id/files', authenticateAdmin, upload.array('files', 10), async (req, res) => {
  try {
    const challenge = await Challenge.findOne({ id: req.params.id });
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    
    const fileData = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype
    }));
    
    challenge.files = challenge.files || [];
    challenge.files.push(...fileData);
    await challenge.save({ validateModifiedOnly: true });
    
    await logAction('UPLOAD_FILE', req.admin.username, 'admin', `Uploaded ${req.files.length} file(s) to: ${challenge.title}`, req);
    
    // Emit socket event to update all clients
    if (io) {
      io.emit('challenge:updated', { challenge: await Challenge.findOne({ id: req.params.id }).select('-flagHash -flag').lean() });
    }
    
    res.json({ success: true, files: fileData, challenge: await Challenge.findOne({ id: req.params.id }).select('-flagHash -flag').lean() });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete file from challenge (admin)
app.delete('/api/admin/challenges/:id/files/:filename', authenticateAdmin, async (req, res) => {
  try {
    const challenge = await Challenge.findOne({ id: req.params.id });
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }
    
    const fileIndex = challenge.files.findIndex(f => f.filename === req.params.filename);
    if (fileIndex === -1) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const filePath = path.join(__dirname, 'uploads', req.params.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    challenge.files.splice(fileIndex, 1);
    await challenge.save({ validateModifiedOnly: true });
    
    await logAction('DELETE_FILE', req.admin.username, 'admin', `Deleted file from: ${challenge.title}`, req);
    
    // Emit socket event to update all clients
    if (io) {
      io.emit('challenge:updated', { challenge: await Challenge.findOne({ id: req.params.id }).select('-flagHash -flag').lean() });
    }
    
    res.json({ success: true, challenge: await Challenge.findOne({ id: req.params.id }).select('-flagHash -flag').lean() });
  } catch (error) {
    console.error('File delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reset all challenge stats (solves, points, first blood)
app.post('/api/admin/challenges/reset-stats', authenticateAdmin, async (req, res) => {
  try {
    // Reset all challenges
    await Challenge.updateMany({}, {
      $set: {
        solves: 0,
        firstBlood: null,
        solvedBy: []
      }
    });

    // Delete all solve records
    const deleteResult = await Solve.deleteMany({});

    // Reset all user solved challenges
    await User.updateMany({}, {
      $set: {
        solvedChallenges: []
      }
    });

    // Reset all team scores
    await Team.updateMany({}, {
      $set: {
        score: 0,
        solvedChallenges: []
      }
    });

    await logAction('RESET_CHALLENGE_STATS', req.admin.username, 'admin', `Reset all challenge statistics. Deleted ${deleteResult.deletedCount} solve records`, req);

    // Emit real-time update to all connected clients
    io.emit('stats-reset', {
      message: 'All challenge statistics have been reset',
      timestamp: new Date()
    });

    res.json({ 
      success: true, 
      message: 'All challenge statistics reset successfully',
      deletedSolves: deleteResult.deletedCount
    });
  } catch (error) {
    console.error('Reset stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Submit flag
app.post('/api/challenges/:id/submit', async (req, res) => {
  try {
    const { flag, username } = req.body;
    const challengeId = req.params.id;
    
    if (!flag || !username) {
      return res.status(400).json({ error: 'Flag and username are required' });
    }
    
    const challenge = await Challenge.findOne({ id: challengeId });
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }
    
    if (challenge.disabled) {
      return res.status(403).json({ error: 'This challenge is currently disabled' });
    }
    
    const user = await User.findOne({ username });
    if (!user || !user.teamId) {
      return res.status(400).json({ error: 'User must be in a team to submit flags' });
    }
    
    const team = await Team.findOne({ code: user.teamId });
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    if (team.solvedChallenges.includes(challengeId)) {
      return res.status(400).json({ error: 'Challenge already solved by your team' });
    }
    
    const isCorrect = await bcrypt.compare(flag, challenge.flagHash);
    if (!isCorrect) {
      await logAction('FLAG_SUBMIT_FAIL', username, 'user', `Failed flag submission for: ${challenge.title}`, req);
      return res.status(400).json({ error: 'Incorrect flag' });
    }
    
    // Correct flag - update team
    team.solvedChallenges.push(challengeId);
    team.score += challenge.points;
    team.lastSolveTime = new Date();
    await team.save();
    
    // Update challenge
    if (!challenge.solvedBy) {
      challenge.solvedBy = [];
    }
    challenge.solvedBy.push(user.teamId);
    await challenge.save({ validateModifiedOnly: true });
    
    // Create solve record with ObjectIds
    try {
      const solve = new Solve({
        team: team._id,
        challenge: challenge._id
      });
      await solve.save();
    } catch (solveError) {
      // Ignore duplicate solve errors (shouldn't happen due to earlier check, but just in case)
      if (solveError.code !== 11000) {
        console.error('Error creating solve record:', solveError);
      }
    }
    
    await logAction('FLAG_SUBMIT_SUCCESS', username, 'user', `Solved: ${challenge.title}`, req);
    
    if (io) {
      io.emit('challenge:solved', { 
        teamCode: user.teamId, 
        challengeId, 
        team: await Team.findOne({ code: user.teamId }).lean() 
      });
    }
    
    res.json({ success: true, message: 'Correct flag!', points: challenge.points });
  } catch (error) {
    console.error('Flag submission error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      challengeId: req.params.id,
      username: req.body.username,
      errorMessage: error.message
    });
    res.status(500).json({ error: 'An error occurred while processing your submission. Please try again.' });
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

    // Check if user is banned
    if (user.banned) {
      await logAction('USER_LOGIN_FAILED', username, 'user', 'Banned user attempted login', req);
      return res.status(403).json({ error: 'Your account has been banned. Please contact support.' });
    }

    // Check if user signed up with Google
    if (user.googleId && !user.password) {
      await logAction('USER_LOGIN_FAILED', username, 'user', 'Google OAuth user attempting password login', req);
      return res.status(400).json({ error: 'This account uses Google Sign-In. Please use the Google login button.' });
    }

    if (!user.password) {
      await logAction('USER_LOGIN_FAILED', username, 'user', 'No password set', req);
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
    console.error('Login error:', error);
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
    // Check if user is banned
    if (user.banned) {
      return res.status(403).json({ error: 'User account is banned' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify JWT token
app.get('/api/auth/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if user is banned
    if (user.banned) {
      return res.status(403).json({ error: 'Account is banned' });
    }
    
    res.json({ username: user.username, userId: user._id, teamId: user.teamId });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// ==================== TEAMS ROUTES ====================

// Get all teams
app.get('/api/teams', async (req, res) => {
  try {
    const teams = await Team.find().sort({ score: -1 });
    res.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      name: error.name
    });
    res.status(500).json({ error: 'Failed to load teams: ' + error.message });
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

// Delete team (admin)
app.delete('/api/admin/teams/:code', authenticateAdmin, async (req, res) => {
  try {
    const team = await Team.findOne({ code: req.params.code });
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // Remove team reference from all users
    await User.updateMany({ teamId: req.params.code }, { $unset: { teamId: '' } });
    
    await Team.findOneAndDelete({ code: req.params.code });
    
    await logAction('DELETE_TEAM', req.admin.username, 'admin', `Deleted team: ${team.name}`, req);
    
    if (io) {
      io.emit('team:deleted', { teamCode: req.params.code });
    }
    
    res.json({ success: true });
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

// Create admin (super admin only)
app.post('/api/admin/admins', authenticateAdmin, async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    const existingAdmin = await Admin.findOne({ $or: [{ username }, { email }] });
    if (existingAdmin) {
      return res.status(400).json({ error: 'Admin username or email already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = new Admin({
      username,
      email,
      password: hashedPassword,
      role: role || 'moderator'
    });
    
    await admin.save();
    await logAction('CREATE_ADMIN', req.admin.username, 'admin', `Created admin: ${username}`, req);
    
    res.status(201).json({ success: true, admin: { username, email, role: admin.role } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete admin (super admin only)
app.delete('/api/admin/admins/:id', authenticateAdmin, async (req, res) => {
  try {
    const admin = await Admin.findByIdAndDelete(req.params.id);
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    
    await logAction('DELETE_ADMIN', req.admin.username, 'admin', `Deleted admin: ${admin.username}`, req);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Change admin password
app.patch('/api/admin/admins/:id/password', authenticateAdmin, async (req, res) => {
  try {
    const { newPassword } = req.body;
    
    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }
    
    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    
    admin.password = await bcrypt.hash(newPassword, 10);
    await admin.save();
    
    await logAction('CHANGE_ADMIN_PASSWORD', req.admin.username, 'admin', `Changed password for: ${admin.username}`, req);
    
    res.json({ success: true });
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

// Delete user (admin)
app.delete('/api/admin/users/:id', authenticateAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Remove user from team
    if (user.teamId) {
      await Team.updateOne(
        { code: user.teamId },
        { $pull: { members: user.username } }
      );
    }
    
    await logAction('DELETE_USER', req.admin.username, 'admin', `Deleted user: ${user.username}`, req);
    
    if (io) {
      io.emit('user:deleted', { username: user.username });
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle user ban (admin)
app.patch('/api/admin/users/:id/ban', authenticateAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    user.banned = !user.banned;
    await user.save();
    
    await logAction('TOGGLE_BAN', req.admin.username, 'admin', `${user.banned ? 'Banned' : 'Unbanned'}: ${user.username}`, req);
    
    if (io) {
      io.emit('user:banned', { username: user.username, banned: user.banned });
    }
    
    res.json({ success: true, user: { ...user.toObject(), password: undefined } });
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

// ==================== ANALYTICS ROUTES ====================

// Get challenge analytics
app.get('/api/admin/analytics/challenges', authenticateAdmin, async (req, res) => {
  try {
    const challenges = await Challenge.find().lean();
    const analytics = challenges.map(ch => ({
      id: ch.id,
      title: ch.title,
      category: ch.category,
      difficulty: ch.difficulty,
      points: ch.points,
      solveCount: ch.solvedBy?.length || 0,
      visible: ch.visible,
      disabled: ch.disabled
    }));
    res.json({ challenges: analytics });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get realtime analytics
app.get('/api/admin/analytics/realtime', authenticateAdmin, async (req, res) => {
  try {
    const [teams, challenges, users, solves] = await Promise.all([
      Team.find().lean(),
      Challenge.find().lean(),
      User.find().lean(),
      Solve.find().sort({ solvedAt: -1 }).limit(50).populate('team').populate('challenge').lean()
    ]);
    
    // Calculate active teams (teams with activity in last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const activeTeams = teams.filter(team => 
      team.lastSolveTime && new Date(team.lastSolveTime) > fiveMinutesAgo
    ).length;

    // Get recent solves
    const recentSolves = solves.slice(0, 10).map(solve => {
      const challenge = solve.challenge;
      const team = solve.team;
      return {
        teamName: team?.teamName || 'Unknown',
        challengeTitle: challenge?.title || 'Unknown',
        category: challenge?.category || 'misc',
        points: challenge?.points || 0,
        solvedAt: solve.solvedAt
      };
    });

    // Get first bloods (first solve for each challenge)
    const firstBloodMap = new Map();
    solves.forEach(solve => {
      if (solve.challenge) {
        const challengeId = solve.challenge._id.toString();
        if (!firstBloodMap.has(challengeId)) {
          firstBloodMap.set(challengeId, {
            teamName: solve.team?.teamName || 'Unknown',
            challengeTitle: solve.challenge?.title || 'Unknown',
            points: solve.challenge?.points || 0,
            solvedAt: solve.solvedAt
          });
        }
      }
    });
    const firstBloods = Array.from(firstBloodMap.values()).slice(0, 10);

    // Get most popular challenges
    const challengeSolveCount = {};
    solves.forEach(solve => {
      if (solve.challenge) {
        const id = solve.challenge._id.toString();
        challengeSolveCount[id] = (challengeSolveCount[id] || 0) + 1;
      }
    });
    const mostPopular = Object.entries(challengeSolveCount)
      .map(([id, count]) => {
        const challenge = challenges.find(ch => ch._id.toString() === id);
        return {
          title: challenge?.title || 'Unknown',
          solves: count,
          category: challenge?.category || 'misc'
        };
      })
      .sort((a, b) => b.solves - a.solves)
      .slice(0, 5);

    // Solves by difficulty
    const solvesByDifficulty = { easy: 0, medium: 0, hard: 0 };
    solves.forEach(solve => {
      if (solve.challenge?.difficulty) {
        const diff = solve.challenge.difficulty.toLowerCase();
        if (solvesByDifficulty.hasOwnProperty(diff)) {
          solvesByDifficulty[diff]++;
        }
      }
    });
    
    const analytics = {
      totalTeams: teams.length,
      totalUsers: users.length,
      totalPlayers: users.length,
      totalChallenges: challenges.length,
      activeChallenges: challenges.filter(ch => ch.visible && !ch.disabled).length,
      visibleChallenges: challenges.filter(ch => ch.visible && !ch.disabled).length,
      activeTeams: activeTeams,
      totalSolves: solves.length,
      averageScore: teams.length > 0 ? Math.round(teams.reduce((sum, team) => sum + team.score, 0) / teams.length) : 0,
      recentSolves,
      firstBloods,
      mostPopular,
      solvesByDifficulty,
      lastUpdated: new Date()
    };
    
    res.json(analytics);
  } catch (error) {
    console.error('Realtime analytics error:', error);
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
              // Check if user is banned
              if (user.banned) {
                console.log('Banned user attempted Google OAuth:', user.username);
                return done(new Error('Account is banned'), null);
              }
              
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
