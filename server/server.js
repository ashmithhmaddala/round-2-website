import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

import User from './models/User.js';
import Team from './models/Team.js';
import Challenge from './models/Challenge.js';
import Admin from './models/Admin.js';
import Solve from './models/Solve.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const allowedOrigins = [
  'https://round-2-website-bqpdjjm7d-ashmithhmaddalas-projects.vercel.app',
  'https://round-2-website-9s311brt4-ashmithhmaddalas-projects.vercel.app',
  'https://nhceosintcrypto.online',
  'https://www.nhceosintcrypto.online',
  'http://localhost:5173'
];
app.use(helmet({
  crossOriginResourcePolicy: false // allow CORS with helmet
}));
app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));
app.use(express.json());

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

app.use('/api/auth/login', loginLimiter);
app.use('/api/challenges/submit', flagLimiter);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas');
    initializeDefaultChallenges();
    initializeSuperAdmin();
  })
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// Configure Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Initialize super admin if none exists
async function initializeSuperAdmin() {
  const adminCount = await Admin.countDocuments({ role: 'super_admin' });
  if (adminCount === 0) {
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
    const superAdmin = new Admin({
      username: 'ash',
      email: 'ashmith.maddala@gmail.com',
      password: hashedPassword,
      role: 'super_admin'
    });
    await superAdmin.save();
    console.log('✅ Super admin initialized');
  }
}

// Initialize default challenges if none exist
async function initializeDefaultChallenges() {
  const count = await Challenge.countDocuments();
  if (count === 0) {
    const bcrypt = require('bcrypt');
    const defaultChallenges = [
      // OSINT Challenges
      {
        id: 'osint-1',
        title: 'Social Media Hunt',
        description: 'Find the hidden profile and retrieve the flag from the bio.',
        category: 'osint',
        difficulty: 'easy',
        points: 100,
        flagPlain: 'CTF{social_media_master}'
      },
      {
        id: 'osint-2',
        title: 'Geolocation Challenge',
        description: 'Identify the location from the given coordinates: 28.6139, 77.2090',
        category: 'osint',
        difficulty: 'medium',
        points: 200,
        flagPlain: 'CTF{new_delhi_india}'
      },
      {
        id: 'osint-3',
        title: 'Image Metadata',
        description: 'Extract the flag hidden in the EXIF data of the provided image.',
        category: 'osint',
        difficulty: 'medium',
        points: 250,
        flagPlain: 'CTF{metadata_expert}'
      },
      {
        id: 'osint-4',
        title: 'Domain Investigation',
        description: 'Find the registration date of example-target.com and format as CTF{YYYY-MM-DD}',
        category: 'osint',
        difficulty: 'hard',
        points: 300,
        flagPlain: 'CTF{2020-05-15}'
      },
      // Cryptography Challenges
      {
        id: 'crypto-1',
        title: 'Caesar Cipher',
        description: 'Decrypt this message: "FWI{fdhvdu_flskhu}"',
        category: 'crypto',
        difficulty: 'easy',
        points: 100,
        flagPlain: 'CTF{caesar_cipher}'
      },
      {
        id: 'crypto-2',
        title: 'Base64 Decode',
        description: 'Decode: Q1RGe2Jhc2U2NF9pc19lYXN5fQ==',
        category: 'crypto',
        difficulty: 'easy',
        points: 150,
        flagPlain: 'CTF{base64_is_easy}'
      },
      {
        id: 'crypto-3',
        title: 'XOR Encryption',
        description: 'XOR decrypt the hex: 1c1e1f with key: 0x42',
        category: 'crypto',
        difficulty: 'medium',
        points: 200,
        flagPlain: 'CTF{xor}'
      },
      {
        id: 'crypto-4',
        title: 'RSA Basics',
        description: 'Given n=3233, e=17, c=2201. Decrypt the message.',
        category: 'crypto',
        difficulty: 'hard',
        points: 300,
        flagPlain: 'CTF{rsa_cracked}'
      },
      {
        id: 'crypto-5',
        title: 'Hash Collision',
        description: 'Find two inputs that produce the same MD5 hash.',
        category: 'crypto',
        difficulty: 'hard',
        points: 400,
        flagPlain: 'CTF{collision_found}'
      }
    ];

    // Hash flags before inserting
    const challengesWithHash = await Promise.all(defaultChallenges.map(async (ch) => {
      const flagHash = await bcrypt.hash(ch.flagPlain, 12);
      const { flagPlain, ...rest } = ch;
      return { ...rest, flagHash };
    }));

    await Challenge.insertMany(challengesWithHash);
    console.log('✅ Default challenges initialized');
  }
}

// ==================== AUTH ROUTES ====================

// Signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      username,
      password: hashedPassword
    });

    await user.save();

    res.json({
      success: true,
      user: {
        username: user.username,
        teamId: user.teamId,
        solvedChallenges: user.solvedChallenges
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    res.json({
      success: true,
      user: {
        username: user.username,
        teamId: user.teamId,
        solvedChallenges: user.solvedChallenges
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user
app.get('/api/auth/user/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      username: user.username,
      teamId: user.teamId,
      solvedChallenges: user.solvedChallenges
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Forgot Password Endpoint
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email }) || await Admin.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    // Save token to user
    user.resetToken = resetToken;
    user.resetTokenExpiry = Date.now() + 3600000; // 1 hour
    await user.save();

    // Send email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Request',
      html: `<p>Click <a href="${resetLink}">here</a> to reset your password. This link is valid for 1 hour.</p>`
    });

    res.json({ success: true, message: 'Password reset email sent' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reset Password Endpoint
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const user = await User.findOne({ resetToken: token, resetTokenExpiry: { $gt: Date.now() } }) ||
                 await Admin.findOne({ resetToken: token, resetTokenExpiry: { $gt: Date.now() } });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Forgot Admin Password
app.post('/api/auth/forgot-admin-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });
  try {
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    const token = crypto.randomBytes(32).toString('hex');
    admin.resetPasswordToken = token;
    admin.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await admin.save();
    // Send email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}&admin=true`;
    const mailOptions = {
      to: admin.email,
      from: process.env.EMAIL_USER,
      subject: 'Admin Password Reset',
      html: `<p>You requested a password reset for your admin account.</p><p>Click <a href="${resetUrl}">here</a> to reset your password. This link will expire in 1 hour.</p>`,
    };
    await transporter.sendMail(mailOptions);
    res.json({ message: 'Password reset email sent to admin.' });
  } catch (err) {
    res.status(500).json({ message: 'Error sending admin password reset email' });
  }
});

// Reset Admin Password
app.post('/api/auth/reset-admin-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ message: 'Token and password are required' });
  try {
    const admin = await Admin.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } });
    if (!admin) return res.status(400).json({ message: 'Invalid or expired token' });
    admin.password = await bcrypt.hash(password, 10);
    admin.resetPasswordToken = undefined;
    admin.resetPasswordExpires = undefined;
    await admin.save();
    res.json({ message: 'Admin password has been reset successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Error resetting admin password' });
  }
});

// ==================== TEAM ROUTES ====================

// Create team
app.post('/api/teams/create', async (req, res) => {
  try {
    const { teamName, username } = req.body;

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Create team
    const team = new Team({
      name: teamName,
      code,
      members: [username],
      createdBy: username
    });

    await team.save();

    // Update user's teamId
    await User.findOneAndUpdate(
      { username },
      { teamId: code }
    );

    res.json({
      success: true,
      team: {
        name: team.name,
        code: team.code,
        members: team.members,
        score: team.score
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Join team
app.post('/api/teams/join', async (req, res) => {
  try {
    const { teamCode, username } = req.body;

    // Find team
    const team = await Team.findOne({ code: teamCode });
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Check if already member
    if (team.members.includes(username)) {
      return res.json({
        success: true,
        team: {
          name: team.name,
          code: team.code,
          members: team.members,
          score: team.score
        }
      });
    }

    // Add member
    team.members.push(username);
    await team.save();

    // Update user's teamId
    await User.findOneAndUpdate(
      { username },
      { teamId: teamCode }
    );

    res.json({
      success: true,
      team: {
        name: team.name,
        code: team.code,
        members: team.members,
        score: team.score
      }
    });
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

    res.json({
      name: team.name,
      code: team.code,
      members: team.members,
      score: team.score,
      solvedChallenges: team.solvedChallenges
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Leave team
app.post('/api/teams/leave', async (req, res) => {
  try {
    const { username, teamCode } = req.body;

    const team = await Team.findOne({ code: teamCode });
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Remove member
    team.members = team.members.filter(m => m !== username);
    
    // Delete team if no members left
    if (team.members.length === 0) {
      await Team.findOneAndDelete({ code: teamCode });
    } else {
      await team.save();
    }

    // Update user
    await User.findOneAndUpdate(
      { username },
      { teamId: null }
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// In-memory cache for leaderboard
let leaderboardCache = {
  data: null,
  ts: 0
};
const LEADERBOARD_CACHE_TTL = 10000; // 10 seconds

// Get all teams (admin/leaderboard)
app.get('/api/teams', async (req, res) => {
  try {
    const now = Date.now();
    if (leaderboardCache.data && (now - leaderboardCache.ts < LEADERBOARD_CACHE_TTL)) {
      return res.json(leaderboardCache.data);
    }
    const teams = await Team.find().sort({ score: -1 });
    leaderboardCache = { data: teams, ts: now };
    res.json(teams);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete team (admin)
app.delete('/api/teams/:code', async (req, res) => {
  try {
    const team = await Team.findOneAndDelete({ code: req.params.code });
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Update all members
    await User.updateMany(
      { teamId: req.params.code },
      { teamId: null }
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== CHALLENGE ROUTES ====================

// Get all challenges
app.get('/api/challenges', async (req, res) => {
  try {
    const challenges = await Challenge.find().select('-flag');
    res.json(challenges);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit flag
app.post('/api/challenges/submit', async (req, res) => {
  try {
    const { challengeId, flag, username, teamCode } = req.body;

    const challenge = await Challenge.findOne({ id: challengeId });
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    // Check flag using bcrypt
    const bcrypt = require('bcrypt');
    const isFlagValid = await bcrypt.compare(flag, challenge.flagHash);
    if (!isFlagValid) {
      return res.json({ success: false, message: 'Incorrect flag' });
    }

    // Check if already solved
    const user = await User.findOne({ username });
    const team = teamCode ? await Team.findOne({ code: teamCode }) : null;

    const existingSolve = await Solve.findOne({
      team: team?._id || null,
      challenge: challenge._id
    });

    if (existingSolve) {
      return res.json({ success: false, message: 'Challenge already solved' });
    }

    // Record solve
    const solve = new Solve({
      team: team?._id || null,
      challenge: challenge._id
    });
    await solve.save();

    // Update user
    user.solvedChallenges.push(challengeId);
    await user.save();

    // Update team
    if (team) {
      team.solvedChallenges.push(challengeId);
      team.score += challenge.points;
      await team.save();
    }

    res.json({ success: true, message: 'Challenge solved successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create challenge (admin)
app.post('/api/challenges', async (req, res) => {
  try {
    const bcrypt = require('bcrypt');
    const { flag, ...rest } = req.body;
    const flagHash = await bcrypt.hash(flag, 12);
    const challenge = new Challenge({ ...rest, flagHash });
    await challenge.save();
    res.json({ success: true, challenge });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update challenge (admin)
app.put('/api/challenges/:id', async (req, res) => {
  try {
    const bcrypt = require('bcrypt');
    const updateData = { ...req.body };
    if (updateData.flag) {
      updateData.flagHash = await bcrypt.hash(updateData.flag, 12);
      delete updateData.flag;
    }
    const challenge = await Challenge.findOneAndUpdate(
      { id: req.params.id },
      updateData,
      { new: true }
    );
    res.json({ success: true, challenge });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete challenge (admin)
app.delete('/api/challenges/:id', async (req, res) => {
  try {
    await Challenge.findOneAndDelete({ id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ADMIN ROUTES ====================

// Admin login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Find admin by username or email
    const admin = await Admin.findOne({
      $or: [{ username }, { email: username }]
    });
    
    if (!admin) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }
    
    // Check password
    const isValid = await bcrypt.compare(password, admin.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }
    
    res.json({ 
      success: true,
      admin: {
        username: admin.username,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all admins
app.get('/api/admin/admins', async (req, res) => {
  try {
    const admins = await Admin.find().select('-password').sort({ createdAt: -1 });
    res.json(admins);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new admin (only super_admin can do this)
app.post('/api/admin/admins', async (req, res) => {
  try {
    const { username, email, password, createdBy } = req.body;
    
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({
      $or: [{ username }, { email }]
    });
    
    if (existingAdmin) {
      return res.status(400).json({ error: 'Admin with this username or email already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create admin
    const admin = new Admin({
      username,
      email,
      password: hashedPassword,
      role: 'admin',
      createdBy
    });
    
    await admin.save();
    
    res.json({
      success: true,
      admin: {
        username: admin.username,
        email: admin.email,
        role: admin.role,
        createdAt: admin.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Change admin password
app.put('/api/admin/change-password', async (req, res) => {
  try {
    const { username, currentPassword, newPassword } = req.body;
    
    // Password validation rules
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }
    if (!/[A-Z]/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one uppercase letter' });
    }
    if (!/[a-z]/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one lowercase letter' });
    }
    if (!/[0-9]/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one number' });
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one special character' });
    }
    
    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    
    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, admin.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    // Hash and save new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    admin.password = hashedPassword;
    await admin.save();
    
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reset admin password (for super admin)
app.put('/api/admin/reset-password', async (req, res) => {
  try {
    const { targetUsername, newPassword, requestingUsername } = req.body;
    
    // Check if requesting user is super admin
    const requestingAdmin = await Admin.findOne({ username: requestingUsername });
    if (!requestingAdmin || requestingAdmin.role !== 'super_admin') {
      return res.status(403).json({ error: 'Only super admin can reset passwords' });
    }
    
    // Password validation rules
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }
    if (!/[A-Z]/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one uppercase letter' });
    }
    if (!/[a-z]/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one lowercase letter' });
    }
    if (!/[0-9]/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one number' });
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one special character' });
    }
    
    const admin = await Admin.findOne({ username: targetUsername });
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    
    // Hash and save new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    admin.password = hashedPassword;
    await admin.save();
    
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete admin
app.delete('/api/admin/admins/:username', async (req, res) => {
  try {
    const admin = await Admin.findOne({ username: req.params.username });
    
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    
    // Prevent deleting super admin
    if (admin.role === 'super_admin') {
      return res.status(403).json({ error: 'Cannot delete super admin' });
    }
    
    await Admin.findOneAndDelete({ username: req.params.username });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get analytics
app.get('/api/admin/analytics', async (req, res) => {
  try {
    const teams = await Team.find().sort({ score: -1 });
    const challenges = await Challenge.find();
    const users = await User.find();

    res.json({
      totalTeams: teams.length,
      totalChallenges: challenges.length,
      totalUsers: users.length,
      teams,
      challenges
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Temporary in-memory log storage for demonstration
const logs = [];

// Middleware to log requests
app.use((req, res, next) => {
  const logEntry = {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString(),
  };
  logs.push(logEntry);
  console.log(logEntry);
  next();
});

// Initialize sample logs during server startup
logs.push(
  { method: 'GET', url: '/api/teams', timestamp: new Date().toISOString() },
  { method: 'POST', url: '/api/challenges/submit', timestamp: new Date().toISOString() },
  { method: 'GET', url: '/api/logs', timestamp: new Date().toISOString() }
);

// Add a test log entry
logs.push({ method: 'TEST', url: '/api/test', timestamp: new Date().toISOString() });

// Debugging logs for `/api/logs` endpoint
app.get('/api/logs', (req, res) => {
  console.log('Logs requested:', logs);
  res.json(logs);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'CTF API is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
