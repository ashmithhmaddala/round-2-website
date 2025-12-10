#!/usr/bin/env node

/**
 * Extract ALL challenge flags from MongoDB
 * This pulls the actual flagHash values
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config({ path: './server/.env' });

const MONGO_URI = process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error('❌ MONGODB_URI not found in .env');
  process.exit(1);
}

const challengeSchema = new mongoose.Schema({
  id: String,
  title: String,
  description: String,
  category: String,
  difficulty: String,
  points: Number,
  flagHash: String,
  solvedBy: [String],
  visible: Boolean,
  disabled: Boolean,
  createdAt: Date
}, { collection: 'challenges' });

const Challenge = mongoose.model('Challenge', challengeSchema);

async function extractFlags() {
  try {
    console.log('🔌 Connecting to MongoDB...\n');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected!\n');

    const challenges = await Challenge.find().sort({ difficulty: 1, points: 1 });

    if (challenges.length === 0) {
      console.log('⚠️  No challenges found in database');
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log(`📊 Found ${challenges.length} challenges\n`);
    console.log('='.repeat(100));
    console.log('CHALLENGE DETAILS:\n');

    challenges.forEach((challenge, index) => {
      console.log(`${index + 1}. ${challenge.title}`);
      console.log(`   ID: ${challenge.id}`);
      console.log(`   Category: ${challenge.category}`);
      console.log(`   Difficulty: ${challenge.difficulty}`);
      console.log(`   Points: ${challenge.points}`);
      console.log(`   Description: ${challenge.description}`);
      console.log(`   Flag Hash: ${challenge.flagHash.substring(0, 50)}...`);
      console.log('   ⚠️  Flag is HASHED - cannot be reversed (bcrypt)');
      console.log('');
    });

    console.log('='.repeat(100));
    console.log('\n⚠️  FLAGS ARE BCRYPT HASHED - CANNOT BE EXTRACTED DIRECTLY\n');
    console.log('To get the flags, you need to:\n');
    console.log('Option 1: Check your original challenge creation file/documentation');
    console.log('Option 2: Use an admin account to view flags (if feature exists)');
    console.log('Option 3: Reset database with known flags\n');
    console.log('Alternatively, reach out to whoever created these challenges.\n');

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

extractFlags();
