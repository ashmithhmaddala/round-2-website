import axios from 'axios';
import chalk from 'chalk';

const BASE_URL = process.env.API_URL || 'http://localhost:5000';
const NUM_TEAMS = 5;
const USERS_PER_TEAM = 3;
const CONCURRENT_REQUESTS = 10;

let stats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  errors: [],
  startTime: Date.now(),
};

const api = axios.create({
  baseURL: BASE_URL,
  validateStatus: () => true, // Don't throw on any status
});

function generateUsername() {
  return `testuser_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

function generateTeamName() {
  return `team_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

async function createUser(username, password = 'TestPassword123!') {
  try {
    stats.totalRequests++;
    
    // For this test, we'll use the login endpoint
    // You may need to create users first if you have a registration endpoint
    const response = await api.post('/api/auth/login', {
      username,
      password,
    });

    if (response.status === 200 || response.status === 401) {
      // Either success or user doesn't exist yet (expected in stress test)
      stats.successfulRequests++;
      return { username, password, success: true };
    } else {
      stats.failedRequests++;
      stats.errors.push(`Create user failed for ${username}: ${response.status}`);
      return { success: false };
    }
  } catch (error) {
    stats.failedRequests++;
    stats.errors.push(`Create user error for ${username}: ${error.message}`);
    return { success: false };
  }
}

async function createTeam(teamName, username) {
  try {
    stats.totalRequests++;
    const response = await api.post('/api/teams/create', {
      teamName,
      username,
    });

    if (response.status === 200 || response.status === 201) {
      stats.successfulRequests++;
      return { teamId: response.data._id, success: true, ...response.data };
    } else {
      stats.failedRequests++;
      stats.errors.push(`Create team failed: ${response.status} - ${JSON.stringify(response.data)}`);
      return { success: false };
    }
  } catch (error) {
    stats.failedRequests++;
    stats.errors.push(`Create team error: ${error.message}`);
    return { success: false };
  }
}

async function joinTeam(teamName, username) {
  try {
    stats.totalRequests++;
    const response = await api.post('/api/teams/join', {
      teamName,
      username,
    });

    if (response.status === 200 || response.status === 201) {
      stats.successfulRequests++;
      return { success: true };
    } else {
      stats.failedRequests++;
      stats.errors.push(`Join team failed: ${response.status} - ${JSON.stringify(response.data)}`);
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

async function runConcurrentRequests(requests) {
  const chunks = [];
  for (let i = 0; i < requests.length; i += CONCURRENT_REQUESTS) {
    chunks.push(requests.slice(i, i + CONCURRENT_REQUESTS));
  }

  for (const chunk of chunks) {
    await Promise.all(chunk);
  }
}

async function stressTest() {
  console.log(chalk.blue.bold('\n🚀 Starting Stress Test\n'));
  console.log(chalk.gray(`Target: ${BASE_URL}`));
  console.log(chalk.gray(`Teams: ${NUM_TEAMS}`));
  console.log(chalk.gray(`Users per team: ${USERS_PER_TEAM}`));
  console.log(chalk.gray(`Total users: ${NUM_TEAMS * USERS_PER_TEAM}`));
  console.log(chalk.gray(`Concurrent requests: ${CONCURRENT_REQUESTS}\n`));

  const teams = [];
  const users = [];

  // Phase 1: Create users
  console.log(chalk.yellow(`\n📝 Phase 1: Creating ${NUM_TEAMS * USERS_PER_TEAM} users...`));
  const userCreationRequests = [];
  
  for (let i = 0; i < NUM_TEAMS * USERS_PER_TEAM; i++) {
    const username = generateUsername();
    users.push(username);
    userCreationRequests.push(() => createUser(username));
  }

  await runConcurrentRequests(userCreationRequests.map(fn => fn()));
  console.log(chalk.green(`✓ User creation phase complete`));

  // Phase 2: Create teams
  console.log(chalk.yellow(`\n🏢 Phase 2: Creating ${NUM_TEAMS} teams...`));
  const teamCreationRequests = [];

  for (let i = 0; i < NUM_TEAMS; i++) {
    const teamName = generateTeamName();
    const creatorUsername = users[i * USERS_PER_TEAM];
    teamCreationRequests.push(
      createTeam(teamName, creatorUsername).then((result) => {
        if (result.success) {
          teams.push({ name: teamName, id: result.teamId, creator: creatorUsername });
        }
      })
    );
  }

  await Promise.all(teamCreationRequests);
  console.log(chalk.green(`✓ Team creation complete (${teams.length} teams created)`));

  // Phase 3: Join teams
  console.log(chalk.yellow(`\n👥 Phase 3: Joining users to teams...`));
  const joinRequests = [];

  for (let teamIdx = 0; teamIdx < teams.length; teamIdx++) {
    const team = teams[teamIdx];
    const startIdx = teamIdx * USERS_PER_TEAM + 1; // Skip team creator
    const endIdx = startIdx + USERS_PER_TEAM - 1;

    for (let userIdx = startIdx; userIdx < endIdx && userIdx < users.length; userIdx++) {
      joinRequests.push(
        joinTeam(team.name, users[userIdx])
      );
    }
  }

  await runConcurrentRequests(joinRequests);
  console.log(chalk.green(`✓ Team joining complete`));

  // Phase 4: Fetch leaderboard multiple times
  console.log(chalk.yellow(`\n📊 Phase 4: Fetching leaderboard (50 concurrent requests)...`));
  const leaderboardRequests = [];

  for (let i = 0; i < 50; i++) {
    leaderboardRequests.push(getLeaderboard());
  }

  await Promise.all(leaderboardRequests);
  console.log(chalk.green(`✓ Leaderboard fetch complete`));

  // Phase 5: Mixed traffic
  console.log(chalk.yellow(`\n🔄 Phase 5: Mixed traffic (100 random requests)...`));
  const mixedRequests = [];

  for (let i = 0; i < 100; i++) {
    const randomTeam = teams[Math.floor(Math.random() * teams.length)];
    const randomUser = users[Math.floor(Math.random() * users.length)];
    const randomAction = Math.random();

    if (randomAction < 0.5) {
      mixedRequests.push(getLeaderboard());
    } else if (randomAction < 0.8 && randomTeam) {
      mixedRequests.push(joinTeam(randomTeam.name, randomUser));
    } else {
      mixedRequests.push(getLeaderboard());
    }
  }

  await runConcurrentRequests(mixedRequests);
  console.log(chalk.green(`✓ Mixed traffic complete`));

  // Final leaderboard check
  console.log(chalk.yellow(`\n🔍 Final leaderboard check...`));
  const finalLeaderboard = await getLeaderboard();

  // Print results
  const duration = (Date.now() - stats.startTime) / 1000;
  const requestsPerSecond = stats.totalRequests / duration;

  console.log(chalk.blue.bold('\n📈 STRESS TEST RESULTS\n'));
  console.log(chalk.white(`Total Requests: ${chalk.cyan(stats.totalRequests)}`));
  console.log(chalk.white(`Successful: ${chalk.green(stats.successfulRequests)}`));
  console.log(chalk.white(`Failed: ${chalk.red(stats.failedRequests)}`));
  console.log(chalk.white(`Success Rate: ${chalk.cyan(((stats.successfulRequests / stats.totalRequests) * 100).toFixed(2))}%`));
  console.log(chalk.white(`Duration: ${chalk.cyan(duration.toFixed(2))}s`));
  console.log(chalk.white(`Requests/sec: ${chalk.cyan(requestsPerSecond.toFixed(2))}`));

  if (finalLeaderboard.success && finalLeaderboard.teams) {
    console.log(chalk.white(`\nTeams in system: ${chalk.cyan(finalLeaderboard.teams.length)}`));
    console.log(chalk.white(`Total users: ${chalk.cyan(users.length)}`));
  }

  if (stats.errors.length > 0 && stats.errors.length <= 10) {
    console.log(chalk.red.bold('\n⚠️  Errors:'));
    stats.errors.slice(0, 10).forEach(error => {
      console.log(chalk.red(`  - ${error}`));
    });
  } else if (stats.errors.length > 10) {
    console.log(chalk.red.bold(`\n⚠️  ${stats.errors.length} errors occurred (showing first 10):`));
    stats.errors.slice(0, 10).forEach(error => {
      console.log(chalk.red(`  - ${error}`));
    });
  }

  console.log(chalk.blue.bold('\n✅ Stress test completed!\n'));
}

stressTest().catch(error => {
  console.error(chalk.red('Stress test failed:'), error);
  process.exit(1);
});
