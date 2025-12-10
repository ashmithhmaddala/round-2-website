# Stress Testing Guide - OSINT CTF Platform

## Overview
This guide provides comprehensive instructions for stress testing the OSINT Cryptography CTF platform with multiple teams and users.

## Prerequisites
- Node.js 14+ installed
- npm packages: axios, chalk
- Server running on specified port (default: 5000)
- Network connectivity to the API server

## Installation

### 1. Install Dependencies
```powershell
npm install axios chalk
```

### 2. Install dev dependencies for monitoring
```powershell
npm install -D @types/node
```

## Testing Scenarios

### Scenario 1: Quick Test (30 seconds)
- **Teams**: 10
- **Users per team**: 3
- **Total Users**: 30
- **Concurrent Requests**: 10
- **Use Case**: Quick validation of basic functionality

```powershell
# PowerShell
node stress-test.js

# Or using the test runner
.\run-stress-test.ps1 -TestType quick
```

### Scenario 2: Standard Load Test (120 seconds)
- **Teams**: 50
- **Users per team**: 5
- **Total Users**: 250
- **Concurrent Requests**: 50
- **Use Case**: Normal production-like load

```powershell
$env:API_URL = 'http://localhost:5000'
$env:DURATION_MINUTES = 2
node load-test.js
```

### Scenario 3: Extended Load Test (300 seconds)
- **Teams**: 100
- **Users**: 1000
- **Concurrent Requests**: 100
- **Use Case**: High-stress scenario testing

```powershell
$env:API_URL = 'http://localhost:5000'
$env:DURATION_MINUTES = 5
node load-test.js
```

## Running Tests

### Option 1: Quick Start
```powershell
# Start your server first
cd server
npm start

# In another terminal, run the stress test
node stress-test.js
```

### Option 2: Using PowerShell Script
```powershell
# Make script executable (if needed)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Run quick test
.\run-stress-test.ps1 -TestType quick

# Run standard test
.\run-stress-test.ps1 -TestType standard -Duration 120

# Run extended test
.\run-stress-test.ps1 -TestType extended

# Run all tests
.\run-stress-test.ps1 -TestType all
```

### Option 3: Custom Configuration
```powershell
$env:API_URL = 'http://your-server:5000'
$env:DURATION_MINUTES = 5
node load-test.js
```

## Test Execution Flow

### Load Test Phases
1. **Phase 1**: Create Users (concurrent)
2. **Phase 2**: Create Teams (concurrent)
3. **Phase 3**: Join Teams (concurrent)
4. **Phase 4**: Fetch Leaderboard (50 concurrent requests)
5. **Phase 5**: Mixed Traffic (100 random requests)

### Metrics Collected
- Total requests made
- Successful requests (status < 400)
- Failed requests (status >= 400)
- Request duration (ms)
- Response time percentiles (P50, P95, P99)
- Requests per second
- Errors by endpoint

## Monitoring During Tests

### 1. Server Performance
```powershell
# Monitor system resources
Get-Process node | Select-Object Name, CPU, WorkingSet

# Or use Windows Task Manager
taskmgr.exe
```

### 2. Database Performance
```javascript
// Monitor in MongoDB Atlas or local instance
db.collection('users').count()
db.collection('teams').count()
db.collection('solves').count()
```

### 3. Network Activity
```powershell
# Monitor network using netstat
netstat -ano -p TCP

# Or use Resource Monitor
perfmon.exe
```

## Interpreting Results

### Success Rate
- **> 99%**: Excellent - No issues detected
- **95-99%**: Good - Minor issues, acceptable for production
- **90-95%**: Warning - Some performance concerns
- **< 90%**: Critical - Significant problems, needs investigation

### Response Times
- **P50 < 100ms**: Very good
- **P50 100-500ms**: Good
- **P50 > 500ms**: Poor performance, optimization needed
- **P99 > 5000ms**: Critical timeouts occurring

### Requests Per Second
- Target RPS depends on infrastructure:
  - Local machine: 100-500 RPS
  - Production server: 1000+ RPS
  - Cloud infrastructure: 5000+ RPS

## Troubleshooting

### Test Fails to Start
```powershell
# Check if server is running
Invoke-WebRequest http://localhost:5000/api/teams -ErrorAction SilentlyContinue

# Check for port conflicts
netstat -ano | findstr ":5000"
```

### High Error Rates
1. Check server logs for errors
2. Verify database connectivity
3. Check rate limiting settings
4. Monitor memory/CPU usage

### Slow Response Times
1. Profile database queries
2. Check network latency
3. Monitor server CPU/memory
4. Review application logs

## Performance Optimization Tips

### For the Server
1. **Connection Pooling**: Increase MongoDB connection pool
2. **Caching**: Implement Redis caching for leaderboard
3. **Indexing**: Ensure proper database indexes
4. **Horizontal Scaling**: Load balance across multiple servers

### For the Test
1. Adjust CONCURRENT_REQUESTS based on system
2. Increase test duration for stable metrics
3. Run tests during off-peak hours
4. Monitor resource limits (file descriptors, etc.)

## Advanced Testing

### Custom Scenarios
Modify the test scripts to create custom scenarios:
```javascript
// Example: Custom endpoint testing
async function customLoad() {
  for (let i = 0; i < 1000; i++) {
    api.post('/api/challenges/solve', {
      challengeId: 'challenge123',
      flag: 'flag{test}'
    });
  }
}
```

### Load Profiles
- **Ramp-up**: Gradually increase load
- **Spike**: Sudden burst of traffic
- **Constant**: Maintain steady load
- **Wave**: Oscillating load pattern

## Results Output

The test scripts will output:
1. Real-time progress with iteration count
2. Final summary statistics
3. Per-endpoint breakdowns
4. Error logs (first 10 errors)
5. Performance percentiles

## Example Results
```
📊 LOAD TEST RESULTS

📈 Overall Statistics:
  Total Requests: 5,423
  Successful: 5,388
  Failed: 35
  Success Rate: 99.36%
  Duration: 120.45s

⚡ Performance Metrics:
  Requests/sec: 45.01
  Avg Response Time: 23.45ms
  Min Response Time: 1.23ms
  Max Response Time: 1,234.56ms
  P50 (Median): 18.90ms
  P95: 89.23ms
  P99: 234.56ms

📍 Endpoint Breakdown:
  /api/teams
    Requests: 2,711 | Avg Time: 5.23ms | Errors: 0.1%
  /api/teams/join
    Requests: 1,356 | Avg Time: 45.67ms | Errors: 0.5%
  /api/challenges
    Requests: 1,356 | Avg Time: 34.56ms | Errors: 0.2%
```

## Next Steps

1. **Log Results**: Save output to file for comparison
2. **Analyze Trends**: Run tests regularly to track performance
3. **Optimize**: Use results to identify bottlenecks
4. **Scale**: Prepare infrastructure for production load
5. **Monitor**: Set up alerting for production environment

## Support

For issues or questions:
1. Check server logs
2. Review MongoDB query performance
3. Check network connectivity
4. Verify API endpoint availability
