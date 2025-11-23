import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import multer from 'multer';
import { GridFSBucket } from 'mongodb';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import User from './models/User.js';
import Team from './models/Team.js';
import Challenge from './models/Challenge.js';
import Admin from './models/Admin.js';
import Solve from './models/Solve.js';
import Announcement from './models/Announcement.js';
import Competition from './models/Competition.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

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
    
    // Initialize GridFS bucket
    const db = mongoose.connection.db;
    gfsBucket = new GridFSBucket(db, {
      bucketName: 'challengeFiles'
    });
    console.log('✅ GridFS bucket initialized');
    
    initializeDefaultChallenges();
    initializeSuperAdmin();
    initializeCompetition();
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

// Initialize competition settings if none exist
async function initializeCompetition() {
  const competitionCount = await Competition.countDocuments();
  if (competitionCount === 0) {
    const now = new Date();
    const competition = new Competition({
      name: 'CTF Competition',
      description: 'Capture The Flag Competition',
      startTime: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 24 hours from now
      endTime: new Date(now.getTime() + 48 * 60 * 60 * 1000), // 48 hours from now
      status: 'upcoming'
    });
    await competition.save();
    console.log('✅ Competition settings initialized');
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
    const { username, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      if (existingUser.username === username) {
        return res.status(400).json({ error: 'Username already exists' });
      }
      if (existingUser.email === email) {
        return res.status(400).json({ error: 'Email already exists' });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Create user
    const user = new User({
      username,
      email,
      password: hashedPassword,
      verificationToken,
      isVerified: false
    });

    await user.save();

    // Send verification email
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    const logoPath = path.join(__dirname, '../src/assets/cseh_final_logo.png');
    
    await transporter.sendMail({
      from: `"NHCE CTF Team" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Verify Your Account - Cache Me If You Can',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f5f5f5; padding: 20px;">
          <div style="background: white; padding: 30px; border-left: 4px solid #5b67f7;">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="cid:logo" alt="NHCE Cybersecurity and Ethical Hacking Club" style="max-width: 150px; height: auto;">
            </div>
            <h2 style="color: #333; margin-top: 0;">Verify Your Account</h2>
            <p style="color: #555; line-height: 1.6;">Welcome to Cache Me If You Can - Round 2!</p>
            <p style="color: #555; line-height: 1.6;">Please click the button below to verify your email address and activate your account:</p>
            <div style="margin: 25px 0;">
              <a href="${verificationLink}" style="background: #5b67f7; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; display: inline-block;">Verify Email</a>
            </div>
            <p style="color: #888; font-size: 14px; line-height: 1.6;">If you didn't create an account, you can safely ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 25px 0;">
            <p style="color: #aaa; font-size: 12px;">NHCE Cybersecurity Club</p>
          </div>
        </div>
      `,
      attachments: [{
        filename: 'cseh_final_logo.png',
        path: logoPath,
        cid: 'logo'
      }]
    });

    res.json({
      success: true,
      message: 'Account created! Please check your email to verify your account before logging in.',
      user: {
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify Email Endpoint
app.post('/api/auth/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    user.isVerified = true;
    user.verificationToken = undefined; // Clear the token
    await user.save();

    res.json({ success: true, message: 'Email verified successfully! You can now log in.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user by username or email
    const user = await User.findOne({ $or: [{ username }, { email: username }] });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check if banned
    if (user.banned) {
      return res.status(403).json({ error: 'This account has been banned for violating the rules.' });
    }

    // Check if verified
    if (user.isVerified === false) {
      return res.status(403).json({ error: 'Please verify your email address before logging in. Check your inbox.' });
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
        email: user.email,
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
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    let user = await User.findOne({ email });
    let isUser = true;
    
    if (!user) {
        user = await Admin.findOne({ email });
        isUser = false;
    }

    if (!user) {
      return res.status(404).json({ 
        error: 'No account found with this email address. Please ensure you signed up with this email or create a new account.' 
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const logoPath = path.join(__dirname, '../src/assets/cseh_final_logo.png');

    // Save token to user
    if (isUser) {
        user.resetToken = resetToken;
        user.resetTokenExpiry = Date.now() + 3600000; // 1 hour
    } else {
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    }
    await user.save();

    // Send email
    await transporter.sendMail({
      from: `"NHCE CTF Team" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset - Cache Me If You Can',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f5f5f5; padding: 20px;">
          <div style="background: white; padding: 30px; border-left: 4px solid #5b67f7;">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="cid:logo" alt="NHCE Cyber Club" style="max-width: 150px; height: auto;">
            </div>
            <h2 style="color: #333; margin-top: 0;">Password Reset</h2>
            <p style="color: #555; line-height: 1.6;">You requested a password reset for Cache Me If You Can - Round 2.</p>
            <p style="color: #555; line-height: 1.6;">Click the button below to set a new password:</p>
            <div style="margin: 25px 0;">
              <a href="${resetLink}" style="background: #5b67f7; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
            </div>
            <p style="color: #888; font-size: 14px; line-height: 1.6;">This link expires in 1 hour.</p>
            <p style="color: #888; font-size: 14px; line-height: 1.6;">Didn't request this? Ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 25px 0;">
            <p style="color: #aaa; font-size: 12px;">NHCE Cybersecurity Club</p>
          </div>
          <p style="color: #888; font-size: 12px; text-align: center; margin-top: 15px;">Check spam if you don't see this.</p>
        </div>
      `,
      attachments: [{
        filename: 'cseh_final_logo.png',
        path: logoPath,
        cid: 'logo'
      }]
    });

    res.json({ success: true, message: 'Password reset email sent successfully!' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to send reset email. Please try again later.' });
  }
});

// Reset Password Endpoint
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    // Check User
    let user = await User.findOne({ resetToken: token });
    let isUser = true;

    // Check Admin if not User
    if (!user) {
      user = await Admin.findOne({ resetPasswordToken: token });
      isUser = false;
    }

    if (!user) {
      return res.status(400).json({ message: 'Invalid reset link. It may be incorrect or has already been used.' });
    }

    // Check Expiry
    const now = Date.now();
    if (isUser) {
      if (!user.resetTokenExpiry || user.resetTokenExpiry < now) {
        return res.status(400).json({ message: 'This reset link has expired. Please request a new one.' });
      }
    } else {
      if (!user.resetPasswordExpires || user.resetPasswordExpires < now) {
        return res.status(400).json({ message: 'This reset link has expired. Please request a new one.' });
      }
    }

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    
    if (isUser) {
      user.resetToken = undefined;
      user.resetTokenExpiry = undefined;
    } else {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
    }
    
    await user.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
    const logoPath = path.join(__dirname, '../src/assets/cseh_final_logo.png');
    
    const mailOptions = {
      to: admin.email,
      from: process.env.EMAIL_USER,
      subject: 'Admin Password Reset',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f5f5f5; padding: 20px;">
          <div style="background: white; padding: 30px; border-left: 4px solid #5b67f7;">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="cid:logo" alt="NHCE Cyber Club" style="max-width: 150px; height: auto;">
            </div>
            <h2 style="color: #333; margin-top: 0;">Admin Password Reset</h2>
            <p style="color: #555; line-height: 1.6;">You requested a password reset for your admin account.</p>
            <p style="color: #555; line-height: 1.6;">Click the button below to reset your password:</p>
            <div style="margin: 25px 0;">
              <a href="${resetUrl}" style="background: #5b67f7; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
            </div>
            <p style="color: #888; font-size: 14px; line-height: 1.6;">This link expires in 1 hour.</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 25px 0;">
            <p style="color: #aaa; font-size: 12px;">NHCE Cybersecurity Club</p>
          </div>
        </div>
      `,
      attachments: [{
        filename: 'cseh_final_logo.png',
        path: logoPath,
        cid: 'logo'
      }]
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
    const admin = await Admin.findOne({ resetPasswordToken: token });
    
    if (!admin) {
      return res.status(400).json({ message: 'Invalid reset link. It may be incorrect or has already been used.' });
    }

    if (admin.resetPasswordExpires < Date.now()) {
      return res.status(400).json({ message: 'This reset link has expired. Please request a new one.' });
    }

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

    // Check competition status
    const competition = await Competition.findOne().sort({ createdAt: -1 });
    if (competition) {
      const now = new Date();
      
      // Auto-update competition status (Enforce time-based status)
      let newStatus = competition.status;
      if (now < competition.startTime) {
        newStatus = 'upcoming';
      } else if (now >= competition.endTime) {
        newStatus = 'ended';
      } else if (competition.freezeTime && now >= competition.freezeTime) {
        newStatus = 'frozen';
      } else if (now >= competition.startTime && now < competition.endTime) {
        if (newStatus === 'upcoming' || newStatus === 'ended') {
          newStatus = 'live';
        }
      }

      if (newStatus !== competition.status) {
        competition.status = newStatus;
        await competition.save();
      }

      // Prevent submissions if competition hasn't started
      if (competition.status === 'upcoming') {
        return res.status(403).json({ 
          error: 'Competition has not started yet',
          startsAt: competition.startTime 
        });
      }

      // Prevent submissions if competition has ended (unless late submissions allowed)
      if (competition.status === 'ended' && !competition.allowLateSubmissions) {
        return res.status(403).json({ 
          error: 'Competition has ended',
          endedAt: competition.endTime 
        });
      }

      // Allow submissions during live and frozen periods
      // (frozen only affects scoreboard visibility, not submissions)
    }

    const challenge = await Challenge.findOne({ id: challengeId });
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    // Check if challenge is disabled
    if (challenge.disabled) {
      return res.status(403).json({ 
        error: 'This challenge is currently disabled',
        message: 'This challenge is temporarily unavailable. Please try again later.'
      });
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

    // Check for first blood
    let isFirstBlood = false;
    if (!challenge.firstBlood || !challenge.firstBlood.teamCode) {
      if (team) {
        challenge.firstBlood = {
          teamCode: team.code,
          teamName: team.name,
          solvedAt: new Date()
        };
        isFirstBlood = true;
      }
    }

    // Update challenge solvedBy
    if (!challenge.solvedBy.includes(teamCode)) {
      challenge.solvedBy.push(teamCode);
    }
    await challenge.save();

    // Update user
    user.solvedChallenges.push(challengeId);
    await user.save();

    // Update team
    if (team) {
      team.solvedChallenges.push(challengeId);
      team.score += challenge.points;
      team.lastSolveTime = new Date();
      await team.save();
    }

    res.json({ 
      success: true, 
      message: isFirstBlood ? '🎉 First Blood! Challenge solved!' : 'Challenge solved successfully',
      firstBlood: isFirstBlood,
      points: challenge.points
    });
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
    const challenge = await Challenge.findOne({ id: req.params.id });
    if (challenge && challenge.files && challenge.files.length > 0) {
      // Delete all associated files from GridFS
      for (const file of challenge.files) {
        try {
          await gfsBucket.delete(file.gridFsId);
        } catch (err) {
          console.error('Error deleting file from GridFS:', err);
        }
      }
    }
    
    await Challenge.findOneAndDelete({ id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== FILE UPLOAD ROUTES ====================

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow all file types for CTF challenges
    cb(null, true);
  }
});

// Upload file for a challenge (admin)
app.post('/api/challenges/:id/files', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Check if GridFS is initialized
    if (!gfsBucket) {
      return res.status(500).json({ error: 'File storage not initialized. Please restart the server.' });
    }

    const challenge = await Challenge.findOne({ id: req.params.id });
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    // Create a unique filename
    const filename = `${Date.now()}-${req.file.originalname}`;

    // Create upload stream to GridFS
    const uploadStream = gfsBucket.openUploadStream(filename, {
      metadata: {
        challengeId: req.params.id,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype
      }
    });

    // Write file buffer to GridFS
    uploadStream.end(req.file.buffer);

    // Wait for upload to finish
    await new Promise((resolve, reject) => {
      uploadStream.on('finish', resolve);
      uploadStream.on('error', reject);
    });

    // Add file metadata to challenge
    const fileMetadata = {
      filename: filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      gridFsId: uploadStream.id,
      uploadedAt: new Date()
    };

    // Update challenge with new file (using updateOne to avoid validation issues)
    await Challenge.updateOne(
      { id: req.params.id },
      { $push: { files: fileMetadata } }
    );

    res.json({
      success: true,
      message: 'File uploaded successfully',
      file: fileMetadata
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Download file from a challenge
app.get('/api/challenges/:id/files/:filename', async (req, res) => {
  try {
    // Check if GridFS is initialized
    if (!gfsBucket) {
      return res.status(500).json({ error: 'File storage not initialized. Please restart the server.' });
    }

    const challenge = await Challenge.findOne({ id: req.params.id });
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    const fileMetadata = challenge.files?.find(f => f.filename === req.params.filename);
    if (!fileMetadata) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Set response headers
    res.set({
      'Content-Type': fileMetadata.mimetype,
      'Content-Disposition': `attachment; filename="${fileMetadata.originalName}"`,
      'Content-Length': fileMetadata.size
    });

    // Create download stream from GridFS
    const downloadStream = gfsBucket.openDownloadStream(fileMetadata.gridFsId);

    // Handle stream errors
    downloadStream.on('error', (error) => {
      console.error('Download stream error:', error);
      if (!res.headersSent) {
        res.status(404).json({ error: 'File not found in storage' });
      }
    });

    // Pipe the file to response
    downloadStream.pipe(res);
  } catch (error) {
    console.error('File download error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

// Delete file from a challenge (admin)
app.delete('/api/challenges/:id/files/:filename', async (req, res) => {
  try {
    const challenge = await Challenge.findOne({ id: req.params.id });
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    const fileMetadata = challenge.files?.find(f => f.filename === req.params.filename);
    if (!fileMetadata) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete from GridFS
    try {
      if (gfsBucket) {
        await gfsBucket.delete(fileMetadata.gridFsId);
      }
    } catch (err) {
      console.error('Error deleting from GridFS:', err);
    }

    // Remove from challenge (using updateOne to avoid validation issues)
    await Challenge.updateOne(
      { id: req.params.id },
      { $pull: { files: { filename: req.params.filename } } }
    );

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('File delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== ADMIN ROUTES ====================

// Get all users (admin)
app.get('/api/admin/users', async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle user ban status
app.patch('/api/admin/users/:id/ban', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    user.banned = !user.banned;
    await user.save();
    
    res.json({ 
      success: true, 
      message: `User ${user.banned ? 'banned' : 'unbanned'} successfully`,
      user: {
        _id: user._id,
        username: user.username,
        banned: user.banned
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete user (admin)
app.delete('/api/admin/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If user is in a team, remove them
    if (user.teamId) {
      const team = await Team.findOne({ code: user.teamId });
      if (team) {
        team.members = team.members.filter(m => m !== user.username);
        if (team.members.length === 0) {
          await Team.findOneAndDelete({ code: user.teamId });
        } else {
          await team.save();
        }
      }
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin login
// Setup admin (one-time use - can be disabled after setup)
app.post('/api/admin/setup', async (req, res) => {
  try {
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ username: 'ash' });
    if (existingAdmin) {
      return res.status(400).json({ error: 'Admin already exists' });
    }
    
    // Create admin with password from environment variable
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
    const admin = new Admin({
      username: 'ash',
      email: 'nhceosseh@gmail.com',
      password: hashedPassword,
      role: 'super_admin'
    });
    
    await admin.save();
    res.json({ success: true, message: 'Admin created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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

// Migration endpoint - Add email to existing users (ONE-TIME USE)
app.post('/api/admin/migrate-add-emails', async (req, res) => {
  try {
    // Find all users without email
    const usersWithoutEmail = await User.find({ email: { $exists: false } });
    
    if (usersWithoutEmail.length === 0) {
      return res.json({ 
        success: true, 
        message: 'All users already have email addresses',
        updated: 0 
      });
    }

    // Add default email for each user (username@placeholder.com)
    const updatePromises = usersWithoutEmail.map(user => {
      user.email = `${user.username}@placeholder.com`;
      return user.save();
    });

    await Promise.all(updatePromises);

    res.json({ 
      success: true, 
      message: `Added email addresses to ${usersWithoutEmail.length} users. Users should update their emails.`,
      updated: usersWithoutEmail.length,
      usernames: usersWithoutEmail.map(u => u.username)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Migration endpoint - Add disabled field to existing challenges (ONE-TIME USE)
app.post('/api/admin/migrate-add-disabled', async (req, res) => {
  try {
    const result = await Challenge.updateMany(
      { disabled: { $exists: false } },
      { $set: { disabled: false } }
    );

    res.json({ 
      success: true, 
      message: `Added disabled field to ${result.modifiedCount} challenges`,
      updated: result.modifiedCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user email endpoint
app.put('/api/auth/update-email', async (req, res) => {
  try {
    const { username, newEmail } = req.body;
    
    if (!username || !newEmail) {
      return res.status(400).json({ error: 'Username and new email are required' });
    }

    // Check if email is already in use
    const existingUser = await User.findOne({ email: newEmail });
    if (existingUser && existingUser.username !== username) {
      return res.status(400).json({ error: 'Email already in use by another user' });
    }

    // Update user email
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.email = newEmail;
    await user.save();

    res.json({ 
      success: true, 
      message: 'Email updated successfully',
      user: {
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete all users endpoint (ADMIN ONLY - USE WITH CAUTION)
app.delete('/api/admin/delete-all-users', async (req, res) => {
  try {
    const result = await User.deleteMany({});
    res.json({ 
      success: true, 
      message: `Deleted ${result.deletedCount} users`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Migration: Add visible field to existing challenges
app.post('/api/admin/migrate-challenge-visibility', async (req, res) => {
  try {
    const result = await Challenge.updateMany(
      { visible: { $exists: false } },
      { $set: { visible: true } }
    );

    res.json({ 
      success: true, 
      message: `Added visibility field to ${result.modifiedCount} challenges`,
      updated: result.modifiedCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== REAL-TIME ANALYTICS ENDPOINTS =====

// Get real-time analytics data
app.get('/api/admin/analytics/realtime', async (req, res) => {
  try {
    const [teams, challenges, solves] = await Promise.all([
      Team.find(),
      Challenge.find(),
      Solve.find().populate('team').populate('challenge').sort({ solvedAt: -1 }).limit(20)
    ]);

    // Calculate metrics
    const totalTeams = teams.length;
    const totalPlayers = teams.reduce((sum, team) => sum + team.members.length, 0);
    const totalChallenges = challenges.length;
    const visibleChallenges = challenges.filter(c => c.visible).length;
    const totalSolves = solves.length;
    
    // Recent solve attempts (last 10)
    const recentSolves = solves.slice(0, 10).map(solve => ({
      teamName: solve.team.name,
      teamCode: solve.team.code,
      challengeTitle: solve.challenge.title,
      challengeId: solve.challenge.id,
      points: solve.challenge.points,
      solvedAt: solve.solvedAt,
      category: solve.challenge.category,
      difficulty: solve.challenge.difficulty
    }));

    // Active teams (teams with solves in last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentTeamCodes = solves
      .filter(s => s.solvedAt >= fiveMinutesAgo)
      .map(s => s.team.code);
    const activeTeams = [...new Set(recentTeamCodes)].length;

    // Challenge popularity (most attempted)
    const challengeAttempts = {};
    challenges.forEach(ch => {
      challengeAttempts[ch.id] = ch.solvedBy.length;
    });
    const mostPopular = challenges
      .map(ch => ({
        id: ch.id,
        title: ch.title,
        attempts: ch.solvedBy.length,
        category: ch.category
      }))
      .sort((a, b) => b.attempts - a.attempts)
      .slice(0, 5);

    // Solve rate by difficulty
    const solvesByDifficulty = {
      easy: 0,
      medium: 0,
      hard: 0
    };
    challenges.forEach(ch => {
      if (ch.solvedBy.length > 0) {
        solvesByDifficulty[ch.difficulty] += ch.solvedBy.length;
      }
    });

    // First bloods
    const firstBloods = challenges
      .filter(ch => ch.firstBlood && ch.firstBlood.teamCode)
      .map(ch => ({
        challengeTitle: ch.title,
        teamName: ch.firstBlood.teamName,
        teamCode: ch.firstBlood.teamCode,
        solvedAt: ch.firstBlood.solvedAt,
        points: ch.points
      }))
      .sort((a, b) => new Date(b.solvedAt) - new Date(a.solvedAt))
      .slice(0, 10);

    res.json({
      metrics: {
        totalTeams,
        totalPlayers,
        totalChallenges,
        visibleChallenges,
        totalSolves,
        activeTeams
      },
      recentSolves,
      mostPopular,
      solvesByDifficulty,
      firstBloods,
      lastUpdated: new Date()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get challenge statistics
app.get('/api/admin/analytics/challenges', async (req, res) => {
  try {
    const challenges = await Challenge.find();
    
    const stats = challenges.map(ch => ({
      id: ch.id,
      title: ch.title,
      category: ch.category,
      difficulty: ch.difficulty,
      points: ch.points,
      totalSolves: ch.solvedBy.length,
      visible: ch.visible,
      firstBlood: ch.firstBlood,
      solveRate: challenges.length > 0 ? (ch.solvedBy.length / challenges.length * 100).toFixed(1) : 0,
      createdAt: ch.createdAt
    }));

    res.json({ challenges: stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle challenge visibility
app.patch('/api/admin/challenges/:id/toggle-visibility', async (req, res) => {
  try {
    const challenge = await Challenge.findOne({ id: req.params.id });
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    const newVisibility = !challenge.visible;
    
    await Challenge.updateOne(
      { id: req.params.id },
      { $set: { visible: newVisibility } }
    );

    res.json({ 
      success: true, 
      message: `Challenge ${newVisibility ? 'shown' : 'hidden'}`,
      challenge: {
        id: challenge.id,
        visible: newVisibility
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle challenge disabled status (admin)
app.patch('/api/admin/challenges/:id/toggle-disabled', async (req, res) => {
  try {
    const challenge = await Challenge.findOne({ id: req.params.id });
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    const newDisabledStatus = !challenge.disabled;
    
    await Challenge.updateOne(
      { id: req.params.id },
      { $set: { disabled: newDisabledStatus } }
    );

    res.json({ 
      success: true, 
      message: `Challenge ${newDisabledStatus ? 'disabled' : 'enabled'}`,
      challenge: {
        id: challenge.id,
        disabled: newDisabledStatus
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get solve timeline (for graphs)
app.get('/api/admin/analytics/timeline', async (req, res) => {
  try {
    const solves = await Solve.find()
      .populate('challenge')
      .sort({ solvedAt: 1 });

    // Group by hour
    const timeline = {};
    solves.forEach(solve => {
      const hour = new Date(solve.solvedAt).toISOString().slice(0, 13) + ':00:00';
      if (!timeline[hour]) {
        timeline[hour] = { total: 0, easy: 0, medium: 0, hard: 0 };
      }
      timeline[hour].total++;
      timeline[hour][solve.challenge.difficulty]++;
    });

    const timelineArray = Object.entries(timeline).map(([time, counts]) => ({
      time,
      ...counts
    }));

    res.json({ timeline: timelineArray });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== ANNOUNCEMENT SYSTEM =====

// Get all announcements (public - for users)
app.get('/api/announcements', async (req, res) => {
  try {
    const now = new Date();
    const announcements = await Announcement.find({
      active: true,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: null },
        { expiresAt: { $gt: now } }
      ]
    }).sort({ pinned: -1, createdAt: -1 });

    res.json({ announcements });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all announcements (admin - includes inactive)
app.get('/api/admin/announcements', async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .sort({ pinned: -1, createdAt: -1 });
    res.json({ announcements });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create announcement
app.post('/api/admin/announcements', async (req, res) => {
  try {
    const { title, message, type, priority, pinned, expiresAt, createdBy } = req.body;
    
    if (!title || !message || !createdBy) {
      return res.status(400).json({ error: 'Title, message, and createdBy are required' });
    }

    const announcement = new Announcement({
      title,
      message,
      type: type || 'info',
      priority: priority || 'medium',
      pinned: pinned || false,
      expiresAt: expiresAt || null,
      createdBy
    });

    await announcement.save();
    res.json({ success: true, announcement });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update announcement
app.put('/api/admin/announcements/:id', async (req, res) => {
  try {
    const { title, message, type, priority, pinned, expiresAt, active } = req.body;
    
    const announcement = await Announcement.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          title,
          message,
          type,
          priority,
          pinned,
          expiresAt,
          active
        }
      },
      { new: true }
    );

    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    res.json({ success: true, announcement });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete announcement
app.delete('/api/admin/announcements/:id', async (req, res) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);
    
    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    res.json({ success: true, message: 'Announcement deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle announcement active status
app.patch('/api/admin/announcements/:id/toggle', async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    
    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    announcement.active = !announcement.active;
    await announcement.save();

    res.json({ 
      success: true, 
      message: `Announcement ${announcement.active ? 'activated' : 'deactivated'}`,
      announcement 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle announcement pin status
app.patch('/api/admin/announcements/:id/pin', async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    
    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    announcement.pinned = !announcement.pinned;
    await announcement.save();

    res.json({ 
      success: true, 
      message: `Announcement ${announcement.pinned ? 'pinned' : 'unpinned'}`,
      announcement 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== COMPETITION ENDPOINTS ====================

// Get current competition settings (public)
app.get('/api/competition', async (req, res) => {
  try {
    const competition = await Competition.findOne().sort({ createdAt: -1 });
    if (!competition) {
      return res.status(404).json({ error: 'No competition configured' });
    }

    // Auto-update status based on current time
    const now = new Date();
    let newStatus = competition.status;

    // Enforce time-based status
    if (now < competition.startTime) {
      newStatus = 'upcoming';
    } else if (now >= competition.endTime) {
      newStatus = 'ended';
    } else if (competition.freezeTime && now >= competition.freezeTime) {
      newStatus = 'frozen';
    } else if (now >= competition.startTime && now < competition.endTime) {
      // If we are in the active period, ensure we are not 'upcoming' or 'ended'
      if (newStatus === 'upcoming' || newStatus === 'ended') {
        newStatus = 'live';
      }
    }

    if (newStatus !== competition.status) {
      competition.status = newStatus;
      await competition.save();
    }

    res.json(competition);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get competition settings (admin)
app.get('/api/admin/competition', async (req, res) => {
  try {
    const competition = await Competition.findOne().sort({ createdAt: -1 });
    if (!competition) {
      return res.status(404).json({ error: 'No competition configured' });
    }
    res.json(competition);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update competition settings (admin)
app.put('/api/admin/competition', async (req, res) => {
  try {
    const { name, description, startTime, endTime, freezeTime, allowLateSubmissions, showScoreboard } = req.body;
    
    const competition = await Competition.findOne().sort({ createdAt: -1 });
    if (!competition) {
      return res.status(404).json({ error: 'No competition configured' });
    }

    // Validate times
    const start = new Date(startTime);
    const end = new Date(endTime);
    const freeze = freezeTime ? new Date(freezeTime) : null;

    if (start >= end) {
      return res.status(400).json({ error: 'Start time must be before end time' });
    }

    if (freeze && (freeze <= start || freeze >= end)) {
      return res.status(400).json({ error: 'Freeze time must be between start and end time' });
    }

    // Update fields
    if (name) competition.name = name;
    if (description) competition.description = description;
    if (startTime) competition.startTime = start;
    if (endTime) competition.endTime = end;
    if (freezeTime !== undefined) competition.freezeTime = freeze;
    if (allowLateSubmissions !== undefined) competition.allowLateSubmissions = allowLateSubmissions;
    if (showScoreboard !== undefined) competition.showScoreboard = showScoreboard;

    // Recalculate status based on new times
    const now = new Date();
    if (now < competition.startTime) {
      competition.status = 'upcoming';
    } else if (now >= competition.endTime) {
      competition.status = 'ended';
    } else if (competition.freezeTime && now >= competition.freezeTime) {
      competition.status = 'frozen';
    } else if (now >= competition.startTime && now < competition.endTime) {
      if (competition.status === 'upcoming' || competition.status === 'ended') {
        competition.status = 'live';
      }
    }

    await competition.save();

    res.json({ 
      success: true, 
      message: 'Competition settings updated',
      competition 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update competition status manually (admin)
app.put('/api/admin/competition/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['upcoming', 'live', 'frozen', 'ended'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be: upcoming, live, frozen, or ended' });
    }

    const competition = await Competition.findOne().sort({ createdAt: -1 });
    if (!competition) {
      return res.status(404).json({ error: 'No competition configured' });
    }

    competition.status = status;
    await competition.save();

    res.json({ 
      success: true, 
      message: `Competition status updated to ${status}`,
      competition 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'CTF API is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
