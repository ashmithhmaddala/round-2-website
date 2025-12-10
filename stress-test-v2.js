#!/usr/bin/env node

/**
 * Stress Test for OSINT Cryptography CTF Platform
 * Creates users, teams, and simulates game activity
 */

import axios from 'axios';
import chalk from 'chalk';

const BASE_URL = process.env.API_URL || 'http://localhost:5000';
const NUM_TEAMS = 5;
const USERS_PER_TEAM = 3;

let stats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  errors: [],
  startTime: Date.now(),
  createdUsers: [],
  createdTeams: []
};

const api = axios.create({
  baseURL: BASE_URL,
  validateStatus: () => true
});

function generateUsername() {
  return `stress_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

function generateTeamName() {
  return `stressTeam_${Math.random().toString(36).substring(2, 8)}`;
}

async function createUser(username) {
  try {
    stats.totalRequests++;
    const response = await api.post('/api/auth/signup', {
      username,
      email: `${username}@test.local`,
      password: 'TestPassword123!'
    });

    if (response.status === 201 || response.status === 200) {
      stats.successfulRequests++;
      stats.createdUsers.push(username);
      return { username, success: true };
    } else if (response.status === 400 && response.data.error?.includes('already exists')) {
      // User already exists, that's okay
      stats.successfulRequests++;
      return { username, success: true };
    } else {
      stats.failedRequests++;
      stats.errors.push(`Create user ${username}: ${response.status} - ${JSON.stringify(response.data)}`);
      return { success: false };
    }
  } catch (error) {
    stats.failedRequests++;
    stats.errors.push(`Create user error: ${error.message}`);
    return { success: false };
  }
}

async function createTeam(teamName, username) {
  try {
    stats.totalRequests++;
    const response = await api.post('/api/teams/create', {
      teamName,
      username
    });

    if (response.status === 201 || response.status === 200) {
      stats.successfulRequests++;
      const teamCode = response.data.team?.code || response.data.teamCode;
      stats.createdTeams.push({ name: teamName, code: teamCode, creator: username });
      return { success: true, teamCode };
    } else {
      stats.failedRequests++;
      stats.errors.push(`Create team: ${response.status} - ${JSON.stringify(response.data)}`);
      return { success: false };
    }
  } catch (error) {
    stats.failedRequests++;
    stats.errors.push(`Create team error: ${error.message}`);
    return { success: false };
  }
}

async function joinTeam(teamCode, username) {
  try {
    stats.totalRequests++;
    const response = await api.post('/api/teams/join', {
      teamCode,
      username
    });

    if (response.status === 200 || response.status === 201) {
      stats.successfulRequests++;
      return { success: true };
    } else {
      stats.failedRequests++;
      stats.errors.push(`Join team: ${response.status} - ${JSON.stringify(response.data)}`);
      return { success: false };
    }
  } catch (error) {
    stats.failedRequests++;
    stats.errors.push(`Join team error: ${error.message}`);
    return { success: false };
  }
}

async function getLeaderboard() {
  try {
    stats.totalRequests++;
    const response = await api.get('/api/teams');

    if (response.status === 200) {
      stats.successfulRequests++;
      return { success: true, teams: response.data };
    } else {
      stats.failedRequests++;
      return { success: false };
    }
  } catch (error) {
    stats.failedRequests++;
    stats.errors.push(`Get leaderboard error: ${error.message}`);
    return { success: false };
  }
}

async function getChallenges() {
  try {
    stats.totalRequests++;
    const response = await api.get('/api/challenges');

    if (response.status === 200) {
      stats.successfulRequests++;
      return { success: true, challenges: response.data };
    } else {
      stats.failedRequests++;
      return { success: false };
    }
  } catch (error) {
    stats.failedRequests++;
    stats.errors.push(`Get challenges error: ${error.message}`);
    return { success: false };
  }
}

async function stressTest() {
  console.log(chalk.blue.bold('\n🚀 OSINT CTF Platform - Stress Test\n'));
  console.log(chalk.gray(`Target: ${BASE_URL}`));
  console.log(chalk.gray(`Teams: ${NUM_TEAMS}`));
  console.log(chalk.gray(`Users per team: ${USERS_PER_TEAM}`));
  console.log(chalk.gray(`Total users: ${NUM_TEAMS * USERS_PER_TEAM}\n`));

  const users = [];
  const teams = [];

  // Phase 1: Create users
  console.log(chalk.yellow(`\n📝 Phase 1: Creating ${NUM_TEAMS * USERS_PER_TEAM} users...`));
  const userCreationPromises = [];
  
  for (let i = 0; i < NUM_TEAMS * USERS_PER_TEAM; i++) {
    const username = generateUsername();
    users.push(username);
    userCreationPromises.push(createUser(username));
  }

  await Promise.all(userCreationPromises);
  console.log(chalk.green(`✓ Created ${stats.createdUsers.length}/${users.length} users`));

  // Phase 2: Create teams
  console.log(chalk.yellow(`\n🏢 Phase 2: Creating ${NUM_TEAMS} teams...`));
  const teamCreationPromises = [];

  for (let i = 0; i < NUM_TEAMS; i++) {
    const teamName = generateTeamName();
    const creatorUsername = users[i * USERS_PER_TEAM];
    
    teamCreationPromises.push(
      createTeam(teamName, creatorUsername).then((result) => {
        if (result.success) {
          teams.push({ name: teamName, code: result.teamCode, creator: creatorUsername });
        }
      })
    );
  }

  await Promise.all(teamCreationPromises);
  console.log(chalk.green(`✓ Created ${teams.length}/${NUM_TEAMS} teams`));

  // Phase 3: Join teams
  console.log(chalk.yellow(`\n👥 Phase 3: Joining users to teams...`));
  const joinPromises = [];

  for (let teamIdx = 0; teamIdx < teams.length; teamIdx++) {
    const team = teams[teamIdx];
    const startIdx = teamIdx * USERS_PER_TEAM + 1;
    const endIdx = startIdx + USERS_PER_TEAM - 1;

    for (let userIdx = startIdx; userIdx < endIdx && userIdx < users.length; userIdx++) {
      joinPromises.push(joinTeam(team.code, users[userIdx]));
    }
  }

  if (joinPromises.length > 0) {
    await Promise.all(joinPromises);
  }
  console.log(chalk.green(`✓ Joined users to teams`));

  // Phase 4: Fetch leaderboard multiple times
  console.log(chalk.yellow(`\n📊 Phase 4: Fetching leaderboard (50 requests)...`));
  const leaderboardPromises = [];

  for (let i = 0; i < 50; i++) {
    leaderboardPromises.push(getLeaderboard());
  }

  await Promise.all(leaderboardPromises);
  console.log(chalk.green(`✓ Leaderboard fetches complete`));

  // Phase 5: Fetch challenges
  console.log(chalk.yellow(`\n🎯 Phase 5: Fetching challenges (50 requests)...`));
  const challengePromises = [];

  for (let i = 0; i < 50; i++) {
    challengePromises.push(getChallenges());
  }

  await Promise.all(challengePromises);
  console.log(chalk.green(`✓ Challenge fetches complete`));

  // Phase 6: Mixed traffic
  console.log(chalk.yellow(`\n🔄 Phase 6: Mixed traffic (100 random requests)...`));
  const mixedPromises = [];

  for (let i = 0; i < 100; i++) {
    const action = Math.random();
    if (action < 0.6) {
      mixedPromises.push(getLeaderboard());
    } else if (action < 0.9 && teams.length > 0) {
      const randomTeam = teams[Math.floor(Math.random() * teams.length)];
      const randomUser = users[Math.floor(Math.random() * users.length)];
      mixedPromises.push(joinTeam(randomTeam.code, randomUser));
    } else {
      mixedPromises.push(getChallenges());
    }
  }

  await Promise.all(mixedPromises);
  console.log(chalk.green(`✓ Mixed traffic complete`));

  // Print results
  const duration = (Date.now() - stats.startTime) / 1000;
  const requestsPerSecond = stats.totalRequests / duration;
  const successRate = (stats.successfulRequests / stats.totalRequests) * 100;

  console.log(chalk.blue.bold('\n📈 STRESS TEST RESULTS\n'));
  console.log(chalk.white(`Total Requests: ${chalk.cyan(stats.totalRequests)}`));
  console.log(chalk.white(`Successful: ${chalk.green(stats.successfulRequests)}`));
  console.log(chalk.white(`Failed: ${chalk.red(stats.failedRequests)}`));
  console.log(chalk.white(`Success Rate: ${chalk.cyan(successRate.toFixed(2))}%`));
  console.log(chalk.white(`Duration: ${chalk.cyan(duration.toFixed(2))}s`));
  console.log(chalk.white(`Requests/sec: ${chalk.cyan(requestsPerSecond.toFixed(2))}`));

  console.log(chalk.white(`\nUsers Created: ${chalk.cyan(stats.createdUsers.length)}`));
  console.log(chalk.white(`Teams Created: ${chalk.cyan(stats.createdTeams.length)}`));

  if (stats.errors.length > 0) {
    console.log(chalk.red.bold('\n⚠️  Errors (showing first 5):'));
    stats.errors.slice(0, 5).forEach(error => {
      console.log(chalk.red(`  - ${error}`));
    });
    if (stats.errors.length > 5) {
      console.log(chalk.red(`  ... and ${stats.errors.length - 5} more errors`));
    }
  }

  console.log(chalk.blue.bold('\n✅ Stress test completed!\n'));
}

stressTest().catch(error => {
  console.error(chalk.red('Stress test failed:'), error);
  process.exit(1);
});
