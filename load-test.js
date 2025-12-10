#!/usr/bin/env node

/**
 * Advanced Stress Test for OSINT Cryptography CTF Platform
 * Tests concurrent teams, users, and real-time updates
 */

import axios from 'axios';
import chalk from 'chalk';
import { performance } from 'perf_hooks';

const BASE_URL = process.env.API_URL || 'http://localhost:5000';
const DURATION_MINUTES = 2; // Duration to run
const MAX_CONCURRENT = 50;

class StressTestRunner {
  constructor() {
    this.metrics = {
      startTime: 0,
      endTime: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalTime: 0,
      responseTimes: [],
      errors: [],
      endpoints: {}
    };

    this.api = axios.create({
      baseURL: BASE_URL,
      timeout: 10000,
      validateStatus: () => true
    });

    this.testData = {
      teams: [],
      users: [],
      teamNames: []
    };
  }

  generateUsername() {
    return `load_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  generateTeamName() {
    return `team_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  async makeRequest(method, endpoint, data = null) {
    const startTime = performance.now();
    
    try {
      const config = {
        method,
        url: endpoint,
        data
      };

      const response = await this.api(config);
      const endTime = performance.now();
      const duration = endTime - startTime;

      this.metrics.totalRequests++;
      this.metrics.responseTimes.push(duration);
      this.metrics.totalTime += duration;

      if (response.status < 400) {
        this.metrics.successfulRequests++;
      } else {
        this.metrics.failedRequests++;
      }

      // Track by endpoint
      if (!this.metrics.endpoints[endpoint]) {
        this.metrics.endpoints[endpoint] = { count: 0, errors: 0, avgTime: 0 };
      }
      this.metrics.endpoints[endpoint].count++;
      this.metrics.endpoints[endpoint].avgTime += duration;

      if (response.status >= 400) {
        this.metrics.endpoints[endpoint].errors++;
      }

      return { success: response.status < 400, data: response.data, status: response.status, duration };
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;

      this.metrics.totalRequests++;
      this.metrics.failedRequests++;
      this.metrics.responseTimes.push(duration);
      this.metrics.totalTime += duration;
      this.metrics.errors.push(error.message);

      if (!this.metrics.endpoints[endpoint]) {
        this.metrics.endpoints[endpoint] = { count: 0, errors: 0, avgTime: 0 };
      }
      this.metrics.endpoints[endpoint].count++;
      this.metrics.endpoints[endpoint].errors++;
      this.metrics.endpoints[endpoint].avgTime += duration;

      return { success: false, error: error.message, duration };
    }
  }

  async createTestData() {
    console.log(chalk.yellow('\n📝 Creating test data...'));
    
    // Create teams
    for (let i = 0; i < 5; i++) {
      const teamName = this.generateTeamName();
      const username = this.generateUsername();
      
      this.testData.teamNames.push(teamName);
      this.testData.users.push(username);

      await this.makeRequest('POST', '/api/teams/create', {
        teamName,
        username
      });
    }

    // Create additional users
    for (let i = 0; i < 20; i++) {
      this.testData.users.push(this.generateUsername());
    }

    console.log(chalk.green(`✓ Created ${this.testData.teamNames.length} teams and ${this.testData.users.length} users`));
  }

  async runLoadTest(durationSeconds = 120) {
    this.metrics.startTime = Date.now();
    const endTime = this.metrics.startTime + (durationSeconds * 1000);
    let iteration = 0;

    console.log(chalk.yellow(`\n🔄 Running load test for ${durationSeconds} seconds...\n`));

    const tasks = [];

    while (Date.now() < endTime) {
      iteration++;

      // Mix of different request types
      const randomAction = Math.random();

      if (randomAction < 0.3) {
        // Get leaderboard
        tasks.push(this.makeRequest('GET', '/api/teams'));
      } else if (randomAction < 0.6) {
        // Join team
        const team = this.testData.teamNames[Math.floor(Math.random() * this.testData.teamNames.length)];
        const user = this.testData.users[Math.floor(Math.random() * this.testData.users.length)];
        tasks.push(
          this.makeRequest('POST', '/api/teams/join', { teamName: team, username: user })
        );
      } else if (randomAction < 0.8) {
        // Get challenges
        tasks.push(this.makeRequest('GET', '/api/challenges'));
      } else {
        // Create new team
        const teamName = this.generateTeamName();
        const username = this.generateUsername();
        tasks.push(
          this.makeRequest('POST', '/api/teams/create', { teamName, username })
        );
      }

      // Maintain concurrent request limit
      if (tasks.length >= MAX_CONCURRENT) {
        await Promise.all(tasks);
        tasks.length = 0;
      }

      // Print progress
      if (iteration % 50 === 0) {
        const elapsed = (Date.now() - this.metrics.startTime) / 1000;
        const rps = this.metrics.totalRequests / elapsed;
        process.stdout.write(`\r  Iteration: ${iteration} | Requests: ${this.metrics.totalRequests} | RPS: ${rps.toFixed(1)}`);
      }
    }

    // Wait for remaining tasks
    if (tasks.length > 0) {
      await Promise.all(tasks);
    }

    this.metrics.endTime = Date.now();
  }

  printResults() {
    const duration = (this.metrics.endTime - this.metrics.startTime) / 1000;
    const avgResponseTime = this.metrics.totalTime / this.metrics.totalRequests;
    const requestsPerSecond = this.metrics.totalRequests / duration;
    const successRate = (this.metrics.successfulRequests / this.metrics.totalRequests) * 100;

    // Sort response times
    this.metrics.responseTimes.sort((a, b) => a - b);
    const p50 = this.metrics.responseTimes[Math.floor(this.metrics.responseTimes.length * 0.5)];
    const p95 = this.metrics.responseTimes[Math.floor(this.metrics.responseTimes.length * 0.95)];
    const p99 = this.metrics.responseTimes[Math.floor(this.metrics.responseTimes.length * 0.99)];
    const minTime = this.metrics.responseTimes[0];
    const maxTime = this.metrics.responseTimes[this.metrics.responseTimes.length - 1];

    console.log(chalk.blue.bold('\n\n📊 LOAD TEST RESULTS\n'));
    console.log(chalk.white('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));

    console.log(chalk.white('\n📈 Overall Statistics:'));
    console.log(chalk.white(`  Total Requests: ${chalk.cyan(this.metrics.totalRequests)}`));
    console.log(chalk.white(`  Successful: ${chalk.green(this.metrics.successfulRequests)}`));
    console.log(chalk.white(`  Failed: ${chalk.red(this.metrics.failedRequests)}`));
    console.log(chalk.white(`  Success Rate: ${chalk.cyan(successRate.toFixed(2) + '%')}`));
    console.log(chalk.white(`  Duration: ${chalk.cyan(duration.toFixed(2) + 's')}`));

    console.log(chalk.white('\n⚡ Performance Metrics:'));
    console.log(chalk.white(`  Requests/sec: ${chalk.yellow(requestsPerSecond.toFixed(2))}`));
    console.log(chalk.white(`  Avg Response Time: ${chalk.yellow(avgResponseTime.toFixed(2) + 'ms')}`));
    console.log(chalk.white(`  Min Response Time: ${chalk.green(minTime.toFixed(2) + 'ms')}`));
    console.log(chalk.white(`  Max Response Time: ${chalk.red(maxTime.toFixed(2) + 'ms')}`));
    console.log(chalk.white(`  P50 (Median): ${chalk.yellow(p50.toFixed(2) + 'ms')}`));
    console.log(chalk.white(`  P95: ${chalk.yellow(p95.toFixed(2) + 'ms')}`));
    console.log(chalk.white(`  P99: ${chalk.red(p99.toFixed(2) + 'ms')}`));

    console.log(chalk.white('\n📍 Endpoint Breakdown:'));
    for (const [endpoint, stats] of Object.entries(this.metrics.endpoints)) {
      const avgTime = stats.avgTime / stats.count;
      const errorRate = (stats.errors / stats.count) * 100;
      console.log(chalk.white(`  ${endpoint}`));
      console.log(chalk.white(`    Requests: ${stats.count} | Avg Time: ${avgTime.toFixed(2)}ms | Errors: ${errorRate.toFixed(1)}%`));
    }

    if (this.metrics.errors.length > 0) {
      console.log(chalk.red.bold('\n⚠️  Errors:'));
      const uniqueErrors = [...new Set(this.metrics.errors)];
      uniqueErrors.slice(0, 5).forEach(error => {
        console.log(chalk.red(`  - ${error}`));
      });
      if (uniqueErrors.length > 5) {
        console.log(chalk.red(`  ... and ${uniqueErrors.length - 5} more error types`));
      }
    }

    console.log(chalk.white('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
  }

  async run() {
    console.log(chalk.blue.bold('\n🚀 OSINT CTF Platform - Load Test Suite\n'));
    console.log(chalk.gray(`Target: ${BASE_URL}`));
    console.log(chalk.gray(`Max Concurrent: ${MAX_CONCURRENT}`));

    try {
      await this.createTestData();
      await this.runLoadTest(DURATION_MINUTES * 60);
      this.printResults();
    } catch (error) {
      console.error(chalk.red('Error during load test:'), error);
      process.exit(1);
    }
  }
}

const runner = new StressTestRunner();
runner.run();
