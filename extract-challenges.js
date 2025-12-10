#!/usr/bin/env node

/**
 * Extract all challenges from MongoDB
 * Shows challenge metadata (but not flags - they're hashed for security)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/osint-ctf';

// Challenge schema
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
  files: Array,
  createdAt: Date
});

const Challenge = mongoose.model('Challenge', challengeSchema);

async function extractChallenges() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✓ Connected\n');

    const challenges = await Challenge.find().lean();
    
    console.log(`Found ${challenges.length} challenges:\n`);
    console.log('=' .repeat(80));

    challenges.forEach((challenge, index) => {
      console.log(`\n${index + 1}. ${challenge.title}`);
      console.log(`   ID: ${challenge.id}`);
      console.log(`   Category: ${challenge.category}`);
      console.log(`   Difficulty: ${challenge.difficulty}`);
      console.log(`   Points: ${challenge.points}`);
      console.log(`   Description: ${challenge.description.substring(0, 100)}...`);
      console.log(`   Visible: ${challenge.visible}`);
      console.log(`   Disabled: ${challenge.disabled}`);
      console.log(`   Solved By: ${challenge.solvedBy?.length || 0} teams`);
      console.log(`   Files: ${challenge.files?.length || 0}`);
      if (challenge.files && challenge.files.length > 0) {
        challenge.files.forEach(file => {
          console.log(`     - ${file.originalName} (${file.size} bytes)`);
        });
      }
      console.log('─'.repeat(80));
    });

    // Filter crypto challenges
    const cryptoOnly = challenges.filter(c => c.category === 'crypto');
    console.log(`\n📊 Summary:`);
    console.log(`Total Challenges: ${challenges.length}`);
    console.log(`OSINT Challenges: ${challenges.filter(c => c.category === 'osint').length}`);
    console.log(`Crypto Challenges: ${cryptoOnly.length}`);
    
    if (cryptoOnly.length > 0) {
      console.log(`\n🔐 Crypto Challenges Only:`);
      cryptoOnly.forEach((challenge, index) => {
        console.log(`\n${index + 1}. ${challenge.title}`);
        console.log(`   ID: ${challenge.id}`);
        console.log(`   Difficulty: ${challenge.difficulty}`);
        console.log(`   Points: ${challenge.points}`);
        console.log(`   Description: ${challenge.description}`);
      });
    }

    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

extractChallenges();
