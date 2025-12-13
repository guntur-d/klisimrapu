# SIMRAPU API Test Script
# Test migrated Fastify endpoints

$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGZlYmU1OGUzZTBlNWY5NDZmNzdhN2QiLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzYxNTMwMzc5LCJleHAiOjE3NjIxMzUxNzl9.qVfmRKE-aAQj7vyK4adohwVlBQWKAK_vGUxFLm7amyY"

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type"  = "application/json"
}

Write-Host "Testing Fastify API endpoints..." -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Yellow

# Test 1: Kode Rekening API (newly migrated)
Write-Host "1. Testing Kode Rekening API..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/koderekening" -Headers $headers -Method Get
    Write-Host "✓ Kode Rekening API: SUCCESS" -ForegroundColor Green
    $dataCount = if ($response.data) { $response.data.Count } else { 0 }
    Write-Host "   Data count: $dataCount" -ForegroundColor Gray
    Write-Host "   Message: $($response.message)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Kode Rekening API: FAILED" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 2: Anggaran API
Write-Host "2. Testing Anggaran API..." -ForegroundColor Cyan
try {
    $baseUrl = "http://localhost:3000/api/anggaran"
    $queryParams = "subPerangkatDaerahId=68f46a885e051327dc600285&budgetYear=2026-Murni"
    $fullUrl = "$baseUrl`?$queryParams"
    $response = Invoke-RestMethod -Uri $fullUrl -Headers $headers -Method Get
    Write-Host "✓ Anggaran API: SUCCESS" -ForegroundColor Green
    Write-Host "   Status: $($response.success)" -ForegroundColor Gray
    if ($response.data) {
        Write-Host "   Data count: $($response.data.Count)" -ForegroundColor Gray
    }
} catch {
    Write-Host "✗ Anggaran API: FAILED" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 3: Kinerja API
Write-Host "3. Testing Kinerja API..." -ForegroundColor Cyan
try {
    $baseUrl = "http://localhost:3000/api/kinerja"
    $queryParams = "subPerangkatDaerahId=68f46a885e051327dc600285&budgetYear=2026-Murni"
    $fullUrl = "$baseUrl`?$queryParams"
    $response = Invoke-RestMethod -Uri $fullUrl -Headers $headers -Method Get
    Write-Host "✓ Kinerja API: SUCCESS" -ForegroundColor Green
    Write-Host "   Status: $($response.success)" -ForegroundColor Gray
    if ($response.data) {
        Write-Host "   Data count: $($response.data.Count)" -ForegroundColor Gray
    }
} catch {
    Write-Host "✗ Kinerja API: FAILED" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 4: SubKegiatan API (newly migrated)
Write-Host "4. Testing SubKegiatan API..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/subkegiatan" -Headers $headers -Method Get
    Write-Host "✓ SubKegiatan API: SUCCESS" -ForegroundColor Green
    Write-Host "   Response: $($response | ConvertTo-Json -Depth 1)" -ForegroundColor Gray
} catch {
    Write-Host "✗ SubKegiatan API: FAILED" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 5: Auth check (should work without token)
Write-Host "5. Testing Auth endpoint (no token required)..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method Post -Body '{"username":"test","password":"test"}' -Headers @{"Content-Type"="application/json"}
    Write-Host "✓ Auth API: SUCCESS" -ForegroundColor Green
    Write-Host "   Response: $($response | ConvertTo-Json -Depth 1)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Auth API: FAILED" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=================================" -ForegroundColor Yellow
Write-Host "Fastify Migration Test Complete!" -ForegroundColor Green