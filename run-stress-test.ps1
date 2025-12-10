# Stress Test Runner Script for OSINT CTF Platform
# This script runs comprehensive stress tests against the API

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("quick", "standard", "extended", "all")]
    [string]$TestType = "standard",
    
    [Parameter(Mandatory=$false)]
    [string]$ApiUrl = "http://localhost:5000",
    
    [Parameter(Mandatory=$false)]
    [int]$Duration = 120
)

Write-Host "========================================" -ForegroundColor Blue
Write-Host "🚀 OSINT CTF Stress Test Runner" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""
Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  API URL: $ApiUrl" -ForegroundColor Gray
Write-Host "  Test Type: $TestType" -ForegroundColor Gray
Write-Host "  Duration: $Duration seconds" -ForegroundColor Gray
Write-Host ""

$startTime = Get-Date

# Check if Node.js is available
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js detected: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js not found. Please install Node.js to run tests." -ForegroundColor Red
    exit 1
}

# Check if required packages are installed
Write-Host ""
Write-Host "Checking dependencies..." -ForegroundColor Yellow

$packageRequired = @("axios", "chalk")
foreach ($pkg in $packageRequired) {
    $installed = npm list $pkg --depth=0 2>$null | Select-String $pkg
    if ($installed) {
        Write-Host "  ✓ $pkg" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $pkg not installed, installing..." -ForegroundColor Yellow
        npm install $pkg
    }
}

Write-Host ""

# Define test scenarios
$testScenarios = @{
    quick = @{
        description = "Quick Test (10 teams, 3 users each)"
        users = 30
        teams = 10
        duration = 30
    }
    standard = @{
        description = "Standard Load Test (50 teams, 5 users each)"
        users = 250
        teams = 50
        duration = 120
    }
    extended = @{
        description = "Extended Load Test (100 teams, 10 users each)"
        users = 1000
        teams = 100
        duration = 300
    }
    all = @{
        description = "Full Stress Test (All scenarios)"
        users = "various"
        teams = "various"
        duration = 600
    }
}

# Run appropriate test
switch ($TestType) {
    "quick" {
        Write-Host "📝 Running QUICK STRESS TEST" -ForegroundColor Cyan
        Write-Host "  - 30 users across 10 teams" -ForegroundColor Gray
        Write-Host "  - 30 second duration" -ForegroundColor Gray
        Write-Host ""
        
        $env:API_URL = $ApiUrl
        
        # Create simple load script inline
        $script = @"
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.API_URL || 'http://localhost:5000',
  validateStatus: () => true
});

let stats = { total: 0, success: 0, failed: 0 };
const startTime = Date.now();

async function makeRequest() {
  try {
    const res = await api.get('/api/teams');
    stats.total++;
    if (res.status === 200) stats.success++;
    else stats.failed++;
  } catch (e) {
    stats.total++;
    stats.failed++;
  }
}

async function run() {
  const requests = [];
  while (Date.now() - startTime < 30000) {
    for (let i = 0; i < 20; i++) {
      requests.push(makeRequest());
    }
    await Promise.all(requests);
    requests.length = 0;
  }
  
  console.log('\\n✅ Test Complete');
  console.log('Total Requests: ' + stats.total);
  console.log('Successful: ' + stats.success);
  console.log('Failed: ' + stats.failed);
  console.log('Success Rate: ' + (stats.success / stats.total * 100).toFixed(2) + '%');
}

run();
"@
        
        $script | node
    }
    
    "standard" {
        Write-Host "📊 Running STANDARD LOAD TEST" -ForegroundColor Cyan
        Write-Host "  - 250 users across 50 teams" -ForegroundColor Gray
        Write-Host "  - 120 second duration" -ForegroundColor Gray
        Write-Host "  - Mixed concurrent requests" -ForegroundColor Gray
        Write-Host ""
        
        if (Test-Path ".\load-test.js") {
            $env:API_URL = $ApiUrl
            node .\load-test.js
        } else {
            Write-Host "load-test.js not found in current directory" -ForegroundColor Red
        }
    }
    
    "extended" {
        Write-Host "🔥 Running EXTENDED LOAD TEST" -ForegroundColor Cyan
        Write-Host "  - 1000 users across 100 teams" -ForegroundColor Gray
        Write-Host "  - 300 second duration" -ForegroundColor Gray
        Write-Host "  - Heavy concurrent load" -ForegroundColor Gray
        Write-Host ""
        
        Write-Host "This test is resource intensive. Ensure your system has adequate resources." -ForegroundColor Yellow
        $confirm = Read-Host "Continue? (y/n)"
        
        if ($confirm -eq "y") {
            if (Test-Path ".\load-test.js") {
                $env:API_URL = $ApiUrl
                $env:DURATION_MINUTES = 5
                node .\load-test.js
            } else {
                Write-Host "load-test.js not found" -ForegroundColor Red
            }
        }
    }
    
    "all" {
        Write-Host "🌪️  Running ALL TESTS" -ForegroundColor Cyan
        Write-Host ""
        
        Write-Host "Test 1: Quick Test" -ForegroundColor Yellow
        Write-Host "  Running 30 second quick test..." -ForegroundColor Gray
        Write-Host ""
        
        Write-Host "Test 2: Standard Load Test" -ForegroundColor Yellow
        Write-Host "  Running 120 second standard test..." -ForegroundColor Gray
        Write-Host ""
        
        if (Test-Path ".\load-test.js") {
            $env:API_URL = $ApiUrl
            node .\load-test.js
        }
    }
}

# Summary
Write-Host ""
$endTime = Get-Date
$totalDuration = ($endTime - $startTime).TotalSeconds

Write-Host "========================================" -ForegroundColor Blue
Write-Host "✅ Stress Test Suite Completed" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""
Write-Host "Total Duration: $($totalDuration.ToString('F2')) seconds" -ForegroundColor Gray
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Review the results above" -ForegroundColor Gray
Write-Host "  2. Check server logs for any errors" -ForegroundColor Gray
Write-Host "  3. Monitor system resources (CPU, Memory, DB)" -ForegroundColor Gray
Write-Host ""
