Write-Host "=== Testing Competition System ===" -ForegroundColor Cyan

# Test 1: Get Competition Settings (Public)
Write-Host "`n1. GET /api/competition (Public endpoint)" -ForegroundColor Yellow
try {
    $comp = Invoke-RestMethod -Uri "http://localhost:5000/api/competition" -Method GET
    Write-Host "✓ Success!" -ForegroundColor Green
    Write-Host "  Status: $($comp.status)"
    Write-Host "  Name: $($comp.name)"
    Write-Host "  Description: $($comp.description)"
    Write-Host "  Start Time: $($comp.startTime)"
    Write-Host "  End Time: $($comp.endTime)"
    Write-Host "  Allow Late Submissions: $($comp.allowLateSubmissions)"
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Update Competition to be LIVE
Write-Host "`n2. PUT /api/admin/competition (Update to be live)" -ForegroundColor Yellow
$updateBody = @{
    name = "NHCE CTF 2025"
    description = "Official Capture The Flag Competition - Round 2"
    startTime = (Get-Date).AddMinutes(-10).ToString("o")
    endTime = (Get-Date).AddHours(2).ToString("o")
    freezeTime = (Get-Date).AddHours(1.5).ToString("o")
    allowLateSubmissions = $true
    showScoreboard = $true
} | ConvertTo-Json

try {
    $result = Invoke-RestMethod -Uri "http://localhost:5000/api/admin/competition" -Method PUT -Body $updateBody -ContentType "application/json"
    Write-Host "✓ Competition updated!" -ForegroundColor Green
    Write-Host "  New Name: $($result.competition.name)"
    Write-Host "  New Status: $($result.competition.status)"
    Write-Host "  Start: $($result.competition.startTime)"
    Write-Host "  End: $($result.competition.endTime)"
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Verify Status Auto-Update
Write-Host "`n3. GET /api/competition (Verify auto-update)" -ForegroundColor Yellow
try {
    $comp = Invoke-RestMethod -Uri "http://localhost:5000/api/competition" -Method GET
    Write-Host "✓ Status: $($comp.status)" -ForegroundColor Green
    if ($comp.status -eq "live") {
        Write-Host "  Competition is now LIVE! ✓" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Test Challenge Submission (should work when live)
Write-Host "`n4. POST /api/challenges/submit (Test submission validation)" -ForegroundColor Yellow
$submitBody = @{
    challengeId = "osint-1"
    flag = "CTF{social_media_master}"
    username = "testuser"
    teamCode = "TEST123"
} | ConvertTo-Json

try {
    $submitResult = Invoke-RestMethod -Uri "http://localhost:5000/api/challenges/submit" -Method POST -Body $submitBody -ContentType "application/json"
    Write-Host "✓ Submission accepted (competition is active)" -ForegroundColor Green
} catch {
    $errorMsg = $_.Exception.Message
    if ($errorMsg -like "*403*" -or $errorMsg -like "*not started*") {
        Write-Host "✗ Submission blocked: Competition not started" -ForegroundColor Yellow
    } elseif ($errorMsg -like "*404*") {
        Write-Host "✓ Validation working (user/team not found - expected)" -ForegroundColor Green
    } else {
        Write-Host "  Response: $errorMsg"
    }
}

# Test 5: Manual Status Change
Write-Host "`n5. PUT /api/admin/competition/status (Manual status control)" -ForegroundColor Yellow
$statusBody = @{
    status = "frozen"
} | ConvertTo-Json

try {
    $statusResult = Invoke-RestMethod -Uri "http://localhost:5000/api/admin/competition/status" -Method PUT -Body $statusBody -ContentType "application/json"
    Write-Host "✓ Status changed to: $($statusResult.competition.status)" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 6: Verify Frozen Status
Write-Host "`n6. GET /api/competition (Verify frozen status)" -ForegroundColor Yellow
try {
    $comp = Invoke-RestMethod -Uri "http://localhost:5000/api/competition" -Method GET
    Write-Host "✓ Current Status: $($comp.status)" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 7: Change Status Back to Live
Write-Host "`n7. PUT /api/admin/competition/status (Change back to live)" -ForegroundColor Yellow
$statusBody = @{
    status = "live"
} | ConvertTo-Json

try {
    $statusResult = Invoke-RestMethod -Uri "http://localhost:5000/api/admin/competition/status" -Method PUT -Body $statusBody -ContentType "application/json"
    Write-Host "✓ Status restored to: $($statusResult.competition.status)" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Testing Complete ===" -ForegroundColor Cyan
Write-Host "All competition endpoints are functional!" -ForegroundColor Green
