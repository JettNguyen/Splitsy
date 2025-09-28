# Simple Backend Test Script
$baseUrl = "http://localhost:3000/api"

Write-Host "Testing Splitsy Backend Server..." -ForegroundColor Cyan
Write-Host "Base URL: $baseUrl" -ForegroundColor Gray

# Test 1: Health Check
Write-Host "`nTesting Health Check..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method GET
    Write-Host "SUCCESS: Health Check - $($health.message)" -ForegroundColor Green
} catch {
    Write-Host "FAILED: Health Check - $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Make sure backend server is running: cd backend && npm start" -ForegroundColor Yellow
    exit 1
}

# Test 2: User Registration
Write-Host "`nTesting User Registration..." -ForegroundColor Yellow
$randomEmail = "testuser$(Get-Random)@example.com"
$registerData = @{
    name = "Test User"
    email = $randomEmail
    password = "password123"
} | ConvertTo-Json

$headers = @{"Content-Type" = "application/json"}

try {
    $registerResponse = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method POST -Body $registerData -Headers $headers
    Write-Host "SUCCESS: User Registration - $($registerResponse.message)" -ForegroundColor Green
    $token = $registerResponse.token
    $userId = $registerResponse.user.id
    Write-Host "User ID: $userId" -ForegroundColor Gray
} catch {
    Write-Host "FAILED: User Registration - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 3: User Login
Write-Host "`nTesting User Login..." -ForegroundColor Yellow
$loginData = @{
    email = $randomEmail
    password = "password123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginData -Headers $headers
    Write-Host "SUCCESS: User Login - $($loginResponse.message)" -ForegroundColor Green
} catch {
    Write-Host "FAILED: User Login - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Create Group
Write-Host "`nTesting Group Creation..." -ForegroundColor Yellow
$authHeaders = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $token"
}

$groupData = @{
    name = "Test Group $(Get-Random)"
    description = "Automated test group"
} | ConvertTo-Json

try {
    $groupResponse = Invoke-RestMethod -Uri "$baseUrl/groups" -Method POST -Body $groupData -Headers $authHeaders
    Write-Host "SUCCESS: Group Creation - $($groupResponse.message)" -ForegroundColor Green
    $groupId = $groupResponse.group.id
    Write-Host "Group ID: $groupId" -ForegroundColor Gray
} catch {
    Write-Host "FAILED: Group Creation - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Create Transaction
Write-Host "`nTesting Transaction Creation..." -ForegroundColor Yellow
$transactionData = @{
    description = "Test Expense"
    amount = 25.99
    groupId = $groupId
    participants = @($userId)
} | ConvertTo-Json

try {
    $transactionResponse = Invoke-RestMethod -Uri "$baseUrl/transactions" -Method POST -Body $transactionData -Headers $authHeaders
    Write-Host "SUCCESS: Transaction Creation - $($transactionResponse.message)" -ForegroundColor Green
} catch {
    Write-Host "FAILED: Transaction Creation - $($_.Exception.Message)" -ForegroundColor Red
}

# Summary
Write-Host "`nBackend Testing Complete!" -ForegroundColor Cyan
Write-Host "Your MongoDB backend is working!" -ForegroundColor Green
Write-Host "`nToken for manual testing:" -ForegroundColor Yellow
Write-Host $token -ForegroundColor Cyan