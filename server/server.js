import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

import User from './models/User.js';
import Team from './models/Team.js';
import Challenge from './models/Challenge.js';
import Admin from './models/Admin.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas');
    initializeDefaultChallenges();
    initializeSuperAdmin();
  })
  .catch((err) => console.error('❌ MongoDB connection error:', err));

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
    const defaultChallenges = [
      // OSINT Challenges
      {
        id: 'osint-1',
        title: 'Social Media Hunt',
        description: 'Find the hidden profile and retrieve the flag from the bio.',
        category: 'osint',
        difficulty: 'easy',
        points: 100,
        flag: 'CTF{social_media_master}'
      },
      {
        id: 'osint-2',
        title: 'Geolocation Challenge',
        description: 'Identify the location from the given coordinates: 28.6139, 77.2090',
        category: 'osint',
        difficulty: 'medium',
        points: 200,
        flag: 'CTF{new_delhi_india}'
      },
      {
        id: 'osint-3',
        title: 'Image Metadata',
        description: 'Extract the flag hidden in the EXIF data of the provided image.',
        category: 'osint',
        difficulty: 'medium',
        points: 250,
        flag: 'CTF{metadata_expert}'
      },
      {
        id: 'osint-4',
        title: 'Domain Investigation',
        description: 'Find the registration date of example-target.com and format as CTF{YYYY-MM-DD}',
        category: 'osint',
        difficulty: 'hard',
        points: 300,
        flag: 'CTF{2020-05-15}'
      },
      // Cryptography Challenges
      {
        id: 'crypto-1',
        title: 'Caesar Cipher',
        description: 'Decrypt this message: "FWI{fdhvdu_flskhu}"',
        category: 'crypto',
        difficulty: 'easy',
        points: 100,
        flag: 'CTF{caesar_cipher}'
      },
      {
        id: 'crypto-2',
        title: 'Base64 Decode',
        description: 'Decode: Q1RGe2Jhc2U2NF9pc19lYXN5fQ==',
        category: 'crypto',
        difficulty: 'easy',
        points: 150,
        flag: 'CTF{base64_is_easy}'
      },
      {
        id: 'crypto-3',
        title: 'XOR Encryption',
        description: 'XOR decrypt the hex: 1c1e1f with key: 0x42',
        category: 'crypto',
        difficulty: 'medium',
        points: 200,
        flag: 'CTF{xor}'
      },
      {
        id: 'crypto-4',
        title: 'RSA Basics',
        description: 'Given n=3233, e=17, c=2201. Decrypt the message.',
        category: 'crypto',
        difficulty: 'hard',
        points: 300,
        flag: 'CTF{rsa_cracked}'
      },
      {
        id: 'crypto-5',
        title: 'Hash Collision',
        description: 'Find two inputs that produce the same MD5 hash.',
        category: 'crypto',
        difficulty: 'hard',
        points: 400,
        flag: 'CTF{collision_found}'
      }
    ];

    await Challenge.insertMany(defaultChallenges);
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


// Get all teams (admin)
app.get('/api/teams', async (req, res) => {
  try {
    const teams = await Team.find().sort({ score: -1 });
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

    // Check flag
    if (challenge.flag !== flag) {
      return res.json({ success: false, message: 'Incorrect flag' });
    }

    // Check if already solved
    const user = await User.findOne({ username });
    if (user.solvedChallenges.includes(challengeId)) {
      return res.json({ success: false, message: 'Challenge already solved' });
    }

    // Update user
    user.solvedChallenges.push(challengeId);
    await user.save();

    // Update team
    if (teamCode) {
      const team = await Team.findOne({ code: teamCode });
      if (team && !team.solvedChallenges.includes(challengeId)) {
        team.solvedChallenges.push(challengeId);
        team.score += challenge.points;
        await team.save();
      }
    }

    // Update challenge
    if (!challenge.solvedBy.includes(username)) {
      challenge.solvedBy.push(username);
      await challenge.save();
    }

    res.json({
      success: true,
      message: 'Correct flag!',
      points: challenge.points
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create challenge (admin)
app.post('/api/challenges', async (req, res) => {
  try {
    const challenge = new Challenge(req.body);
    await challenge.save();
    res.json({ success: true, challenge });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update challenge (admin)
app.put('/api/challenges/:id', async (req, res) => {
  try {
    const challenge = await Challenge.findOneAndUpdate(
      { id: req.params.id },
      req.body,
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'CTF API is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
