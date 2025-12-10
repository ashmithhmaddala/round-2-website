#!/usr/bin/env node

/**
 * Seed crypto challenges to MongoDB
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

// Default admin credentials (from environment or defaults)
const ADMIN_USERNAME = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASS || 'admin@123';

// Challenge data with actual flags
const challenges = [
  {
    id: 'crypto-1',
    title: 'Caesar Cipher Basics',
    description: 'Decode this message encrypted with a Caesar cipher (shift of 3): "Khoor Zruog"',
    category: 'crypto',
    difficulty: 'easy',
    points: 50,
    flag: 'flag{hello_world}'
  },
  {
    id: 'crypto-2',
    title: 'ROT13 Decoder',
    description: 'Decode this ROT13 message: "Gur dhvpx oebja sbk whzcf bire gur ynml qbt"',
    category: 'crypto',
    difficulty: 'easy',
    points: 50,
    flag: 'flag{the_quick_brown_fox_jumps_over_the_lazy_dog}'
  },
  {
    id: 'crypto-3',
    title: 'Base64 Encoding',
    description: 'Decode this Base64 string: "Vmlnb25lcmUgRWF0IG5vIFRvcm8h"',
    category: 'crypto',
    difficulty: 'easy',
    points: 50,
    flag: 'flag{vignere_eat_no_toro}'
  },
  {
    id: 'crypto-4',
    title: 'Morse Code Translation',
    description: 'Translate this Morse code: ".... . .-.. .-.. --- / .-- --- .-. .-.. -.."',
    category: 'crypto',
    difficulty: 'medium',
    points: 100,
    flag: 'flag{hello_world}'
  },
  {
    id: 'crypto-5',
    title: 'Vigenere Cipher',
    description: 'Decode this Vigenere cipher with key "SECRET": "ZIVZHIX UIIXC"',
    category: 'crypto',
    difficulty: 'medium',
    points: 100,
    flag: 'flag{vigenereisgood}'
  },
  {
    id: 'crypto-6',
    title: 'Atbash Cipher',
    description: 'Decode using Atbash cipher (reverse alphabet substitution): "Zyxwvutsrqponmlkjihgfedcba"',
    category: 'crypto',
    difficulty: 'medium',
    points: 100,
    flag: 'flag{atbash_reversed}'
  },
  {
    id: 'crypto-7',
    title: 'XOR Encryption',
    description: 'Find the XOR key and decrypt: "4a5a4a5a5d5a5a5a" (hex encoded)',
    category: 'crypto',
    difficulty: 'hard',
    points: 150,
    flag: 'flag{xor_is_simple}'
  },
  {
    id: 'crypto-8',
    title: 'MD5 Hash Cracking',
    description: 'Crack this MD5 hash: "5d41402abc4b2a76b9719d911017c592" (hint: common word)',
    category: 'crypto',
    difficulty: 'hard',
    points: 150,
    flag: 'flag{hello}'
  }
];

async function seedChallenges() {
  try {
    console.log('🔐 Authenticating as admin...');
    
    // Login to get JWT token
    let adminToken;
    try {
      const loginResponse = await axios.post(
        `${BASE_URL}/api/admin/login`,
        {
          username: ADMIN_USERNAME,
          password: ADMIN_PASSWORD
        }
      );
      adminToken = loginResponse.data.token;
      console.log('✓ Admin authenticated\n');
    } catch (loginError) {
      console.log('⚠ Admin login failed, trying to create admin...');
      // Try to create admin first
      try {
        await axios.post(`${BASE_URL}/api/admin/register`, {
          username: ADMIN_USERNAME,
          password: ADMIN_PASSWORD
        });
        console.log('✓ Admin created');
        
        // Now login
        const loginResponse = await axios.post(
          `${BASE_URL}/api/admin/login`,
          {
            username: ADMIN_USERNAME,
            password: ADMIN_PASSWORD
          }
        );
        adminToken = loginResponse.data.token;
        console.log('✓ Admin authenticated\n');
      } catch (createError) {
        console.error('✗ Failed to authenticate or create admin');
        console.error('Error:', createError.response?.data?.error || createError.message);
        process.exit(1);
      }
    }
    
    console.log('🌱 Seeding crypto challenges...\n');
    
    for (const challenge of challenges) {
      try {
        const response = await axios.post(
          `${BASE_URL}/api/admin/challenges`,
          challenge,
          {
            headers: {
              'Authorization': `Bearer ${adminToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log(`✓ Created: ${challenge.title}`);
        console.log(`  ID: ${challenge.id}`);
        console.log(`  Difficulty: ${challenge.difficulty}`);
        console.log(`  Points: ${challenge.points}\n`);
      } catch (error) {
        if (error.response?.status === 409) {
          console.log(`⚠ Already exists: ${challenge.title}\n`);
        } else {
          console.log(`✗ Failed to create ${challenge.title}`);
          console.log(`  Error: ${error.response?.data?.error || error.message}\n`);
        }
      }
    }
    
    console.log('✅ Seeding complete!');
    
    // Fetch all challenges
    console.log('\n📊 Fetching all challenges...\n');
    const allChallenges = await axios.get(`${BASE_URL}/api/challenges`);
    console.log(`Total challenges in system: ${allChallenges.data.length}`);
    
    const cryptoOnly = allChallenges.data.filter(c => c.category === 'crypto');
    console.log(`Crypto challenges: ${cryptoOnly.length}`);
    
    console.log('\n🔐 Crypto Challenges:');
    cryptoOnly.forEach((c, i) => {
      console.log(`${i+1}. ${c.title}`);
      console.log(`   ID: ${c.id}`);
      console.log(`   Points: ${c.points}\n`);
    });
    
  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

seedChallenges();
