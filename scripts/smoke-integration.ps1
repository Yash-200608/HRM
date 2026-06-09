#Requires -Version 5.1
<#
.SYNOPSIS
  Smoke-test connectivity between new-hrm/back and Subscription.

.DESCRIPTION
  1. Validates shared environment variables
  2. Pings Subscription /health and HRM API
  3. Exercises internal API (plans, feature check, optional trial provision)
  4. Verifies HRM outbox inbound signature acceptance

.PARAMETER SubscriptionUrl
  Subscription base URL (default: env SUBSCRIPTION_API_BASE_URL or http://127.0.0.1:3000)

.PARAMETER HrmUrl
  HRM API base URL (default: env HRM_PUBLIC_BASE_URL or http://127.0.0.1:5000)

.PARAMETER OrganizationId
  Existing Mongo organization/company id for feature-check. If omitted, script creates a temporary org.

.PARAMETER SkipProvision
  Skip trial subscription provision smoke step.

.PARAMETER HrmAccessToken
  Optional HRM JWT to verify authenticated billing proxy (/api/plans).

.EXAMPLE
  .\scripts\smoke-integration.ps1

.EXAMPLE
  .\scripts\smoke-integration.ps1 -OrganizationId 64f1c2ab3d9e4f5a6b7c8d90
#>
[CmdletBinding()]
param(
  [string]$SubscriptionUrl,
  [string]$HrmUrl,
  [string]$OrganizationId,
  [switch]$SkipProvision,
  [string]$HrmAccessToken
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Script:RepoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Script:Failures = New-Object System.Collections.Generic.List[string]
$Script:Passes = New-Object System.Collections.Generic.List[string]
$Script:CreatedOrganizationId = $null

function Write-Pass([string]$Message) {
  $Script:Passes.Add($Message)
  Write-Host "[PASS] $Message" -ForegroundColor Green
}

function Write-Fail([string]$Message) {
  $Script:Failures.Add($Message)
  Write-Host "[FAIL] $Message" -ForegroundColor Red
}

function Write-Info([string]$Message) {
  Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Import-DotEnvFile([string]$Path) {
  if (-not (Test-Path $Path)) {
    return
  }

  Get-Content $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) {
      return
    }

    $index = $line.IndexOf("=")
    if ($index -lt 1) {
      return
    }

    $key = $line.Substring(0, $index).Trim()
    $value = $line.Substring($index + 1).Trim()
    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
      $value = $value.Substring(1, $value.Length - 2)
    }

    if (-not [string]::IsNullOrWhiteSpace($key) -and $null -eq [Environment]::GetEnvironmentVariable($key)) {
      [Environment]::SetEnvironmentVariable($key, $value)
    }
  }
}

function Get-EnvValue([string]$Name, [string]$Default = "") {
  $value = [Environment]::GetEnvironmentVariable($Name)
  if ([string]::IsNullOrWhiteSpace($value)) {
    return $Default
  }
  return $value
}

function Invoke-SmokeRequest {
  param(
    [string]$Method = "GET",
    [string]$Url,
    [hashtable]$Headers = @{},
    [string]$Body = $null,
    [int[]]$AllowedStatuses = @(200)
  )

  $allowed = @($AllowedStatuses)
  try {
    $params = @{
      Method      = $Method
      Uri         = $Url
      Headers     = $Headers
      TimeoutSec  = 15
      ErrorAction = "Stop"
    }

    if ($Body) {
      $params["Body"] = $Body
      if (-not $Headers.ContainsKey("content-type")) {
        $params["ContentType"] = "application/json"
      }
    }

    $response = Invoke-WebRequest @params
    return @{
      Ok = $allowed -contains $response.StatusCode
      StatusCode = $response.StatusCode
      Content = $response.Content
      Error = $null
    }
  }
  catch {
    $statusCode = $null
    $content = $null
    if ($_.Exception.Response) {
      $statusCode = [int]$_.Exception.Response.StatusCode
      try {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $content = $reader.ReadToEnd()
        $reader.Close()
      }
      catch {
        $content = $_.Exception.Message
      }
    }

    return @{
      Ok = $allowed -contains $statusCode
      StatusCode = $statusCode
      Content = $content
      Error = $_.Exception.Message
    }
  }
}

function Test-EnvAlignment {
  Write-Info "Checking shared environment alignment"

  $required = @(
    "MONGODB_URI",
    "INTERNAL_API_KEY",
    "OUTBOX_DELIVERY_SECRET",
    "ACCESS_TOKEN_SECRET"
  )

  foreach ($name in $required) {
    $value = Get-EnvValue $name
    if ([string]::IsNullOrWhiteSpace($value) -or $value -match "replace-with-") {
      Write-Fail "Environment variable $name is missing or still a placeholder"
    }
    else {
      Write-Pass "Environment variable $name is set"
    }
  }

  $hrmAccess = Get-EnvValue "HRM_ACCESS_TOKEN_SECRET"
  $access = Get-EnvValue "ACCESS_TOKEN_SECRET"
  if ($hrmAccess -and $access -and $hrmAccess -ne $access) {
    Write-Fail "HRM_ACCESS_TOKEN_SECRET and ACCESS_TOKEN_SECRET differ (Subscription JWT bridge may fail)"
  }
  else {
    Write-Pass "JWT secrets are aligned for HRM <-> Subscription"
  }

  $outboxUrl = Get-EnvValue "OUTBOX_DELIVERY_URL"
  $hrmBase = $Script:HrmUrl.TrimEnd("/")
  $expectedOutbox = "$hrmBase/api/platform/outbox/inbound"
  if ($outboxUrl -and $outboxUrl.TrimEnd("/") -ne $expectedOutbox) {
    Write-Fail "OUTBOX_DELIVERY_URL ($outboxUrl) does not match expected $expectedOutbox"
  }
  elseif ($outboxUrl) {
    Write-Pass "OUTBOX_DELIVERY_URL points at HRM outbox inbound"
  }
  else {
    Write-Fail "OUTBOX_DELIVERY_URL is not configured"
  }

  $subscriptionBase = Get-EnvValue "SUBSCRIPTION_API_BASE_URL"
  if ($subscriptionBase -and $subscriptionBase.TrimEnd("/") -ne $Script:SubscriptionUrl.TrimEnd("/")) {
    Write-Info "SUBSCRIPTION_API_BASE_URL ($subscriptionBase) differs from script target $($Script:SubscriptionUrl)"
  }
}

function Test-ServiceHealth {
  Write-Info "Checking service health endpoints"

  $subHealth = Invoke-SmokeRequest -Url "$($Script:SubscriptionUrl)/health"
  if ($subHealth.Ok) {
    Write-Pass "Subscription health responded ($($subHealth.StatusCode))"
  }
  else {
    Write-Fail "Subscription health failed ($($subHealth.StatusCode)) - is Subscription running on $($Script:SubscriptionUrl)?"
  }

  $hrmProbe = Invoke-SmokeRequest -Url "$($Script:HrmUrl)/api-docs" -AllowedStatuses 200,301,302
  if ($hrmProbe.Ok) {
    Write-Pass "HRM API responded ($($hrmProbe.StatusCode) at /api-docs)"
  }
  else {
    Write-Fail "HRM API unreachable ($($hrmProbe.StatusCode)) - is new-hrm/back running on $($Script:HrmUrl)?"
  }
}

function Get-InternalHeaders {
  $key = Get-EnvValue "INTERNAL_API_KEY"
  return @{
    "x-internal-api-key" = $key
    "accept" = "application/json"
  }
}

function New-IdempotencyKey([string]$Prefix) {
  return "${Prefix}:$([Guid]::NewGuid().ToString())"
}

function Ensure-OrganizationId {
  if ($OrganizationId) {
    $Script:CreatedOrganizationId = $OrganizationId
    Write-Pass "Using provided OrganizationId $OrganizationId"
    return $OrganizationId
  }

  Write-Info "Creating temporary organization for smoke checks"
  $slug = "smoke-" + [Guid]::NewGuid().ToString("N").Substring(0, 10)
  $body = @{
    name = "Smoke Test Org"
    slug = $slug
  } | ConvertTo-Json -Compress

  $headers = Get-InternalHeaders
  $headers["Idempotency-Key"] = New-IdempotencyKey "smoke-org"

  $create = Invoke-SmokeRequest `
    -Method POST `
    -Url "$($Script:SubscriptionUrl)/v1/organizations" `
    -Headers $headers `
    -Body $body `
    -AllowedStatuses 200,201

  if (-not $create.Ok) {
    Write-Fail "Could not create smoke organization ($($create.StatusCode))"
    return $null
  }

  $parsed = $create.Content | ConvertFrom-Json
  $orgId = $parsed.data._id
  if (-not $orgId) {
    $orgId = $parsed.data.id
  }

  if (-not $orgId) {
    Write-Fail "Organization create response did not include an id"
    return $null
  }

  $Script:CreatedOrganizationId = [string]$orgId
  Write-Pass "Created smoke organization $orgId"
  return [string]$orgId
}

function Test-PlansEndpoint {
  Write-Info "Checking Subscription plans catalog"

  $plans = Invoke-SmokeRequest -Url "$($Script:SubscriptionUrl)/v1/plans"
  if (-not $plans.Ok) {
    Write-Fail "GET /v1/plans failed ($($plans.StatusCode))"
    return
  }

  $parsed = $plans.Content | ConvertFrom-Json
  $count = 0
  if ($parsed.data) {
    $count = @($parsed.data).Count
  }

  if ($count -gt 0) {
    Write-Pass "Subscription plans catalog returned $count plan(s)"
  }
  else {
    Write-Fail "Subscription plans catalog is empty - run Subscription seed:plans"
  }
}

function Test-FeatureCheck([string]$OrgId) {
  if (-not $OrgId) {
    Write-Fail "Skipping feature check - no organization id"
    return
  }

  Write-Info "Checking entitlement path POST /v1/features/check"
  $body = @{
    organizationId = $OrgId
    feature = "employeeManagement"
  } | ConvertTo-Json -Compress

  $headers = Get-InternalHeaders
  $headers["Idempotency-Key"] = New-IdempotencyKey "smoke-feature"

  $check = Invoke-SmokeRequest `
    -Method POST `
    -Url "$($Script:SubscriptionUrl)/v1/features/check" `
    -Headers $headers `
    -Body $body `
    -AllowedStatuses 200

  if (-not $check.Ok) {
    Write-Fail "Feature check failed ($($check.StatusCode))"
    return
  }

  $parsed = $check.Content | ConvertFrom-Json
  $allowed = $parsed.data.allowed
  if ($null -ne $allowed) {
    Write-Pass "Feature check succeeded (employeeManagement allowed=$allowed)"
  }
  else {
    Write-Fail "Feature check response missing data.allowed"
  }
}

function Test-TrialProvision([string]$OrgId) {
  if ($SkipProvision) {
    Write-Info "Skipping trial provision (-SkipProvision)"
    return
  }

  if (-not $OrgId) {
    Write-Fail "Skipping trial provision - no organization id"
    return
  }

  Write-Info "Checking trial subscription provision POST /v1/subscriptions"
  $planCode = Get-EnvValue "TRIAL_PLAN_CODE" "starter"
  $body = @{
    organizationId = $OrgId
    planCode = $planCode
  } | ConvertTo-Json -Compress

  $headers = Get-InternalHeaders
  $headers["Idempotency-Key"] = New-IdempotencyKey "smoke-trial"

  $create = Invoke-SmokeRequest `
    -Method POST `
    -Url "$($Script:SubscriptionUrl)/v1/subscriptions" `
    -Headers $headers `
    -Body $body `
    -AllowedStatuses 200,201,409

  if ($create.StatusCode -eq 409) {
    Write-Pass "Trial provision path reachable (subscription already exists - expected for reruns)"
    return
  }

  if ($create.Ok) {
    Write-Pass "Trial subscription provision succeeded for plan '$planCode'"
  }
  else {
    Write-Fail "Trial subscription provision failed ($($create.StatusCode))"
  }
}

function Test-HrmProxy([string]$OrgId) {
  if (-not $HrmAccessToken) {
    Write-Info "Skipping HRM proxy check (pass -HrmAccessToken to test /api/plans through HRM)"
    return
  }

  Write-Info "Checking HRM billing proxy with user JWT"
  $headers = @{
    "Authorization" = "Bearer $HrmAccessToken"
    "accept" = "application/json"
  }

  $proxy = Invoke-SmokeRequest `
    -Url "$($Script:HrmUrl)/api/plans" `
    -Headers $headers `
    -AllowedStatuses 200

  if ($proxy.Ok) {
    Write-Pass "HRM authenticated proxy /api/plans responded ($($proxy.StatusCode))"
  }
  else {
    Write-Fail "HRM proxy /api/plans failed ($($proxy.StatusCode))"
  }
}

function Test-OutboxInbound {
  Write-Info "Checking HRM outbox inbound signature acceptance"

  $secret = Get-EnvValue "OUTBOX_DELIVERY_SECRET"
  if ([string]::IsNullOrWhiteSpace($secret)) {
    Write-Fail "Skipping outbox test - OUTBOX_DELIVERY_SECRET missing"
    return
  }

  $eventId = "smoke-" + [Guid]::NewGuid().ToString()
  $payload = @{
    eventId = $eventId
    topic = "smoke.integration"
    aggregateType = "SmokeTest"
    aggregateId = "smoke"
    organizationId = $Script:CreatedOrganizationId
    payload = @{ source = "smoke-integration.ps1" }
    attempts = 0
    emittedAt = (Get-Date).ToUniversalTime().ToString("o")
  }
  $body = $payload | ConvertTo-Json -Compress -Depth 6

  $hmac = New-Object System.Security.Cryptography.HMACSHA256
  $hmac.Key = [Text.Encoding]::UTF8.GetBytes($secret)
  $hash = $hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($body))
  $signature = -join ($hash | ForEach-Object { $_.ToString("x2") })

  $headers = @{
    "content-type" = "application/json"
    "x-outbox-signature" = $signature
    "x-outbox-event-id" = $eventId
    "x-outbox-topic" = "smoke.integration"
    "x-outbox-aggregate-type" = "SmokeTest"
    "x-outbox-aggregate-id" = "smoke"
  }

  $outbox = Invoke-SmokeRequest `
    -Method POST `
    -Url "$($Script:HrmUrl)/api/platform/outbox/inbound" `
    -Headers $headers `
    -Body $body `
    -AllowedStatuses 200

  if ($outbox.Ok) {
    Write-Pass "HRM outbox inbound accepted signed payload (unsupported topic ignored)"
  }
  else {
    Write-Fail "HRM outbox inbound failed ($($outbox.StatusCode))"
  }
}

# --- main ---
Write-Host ""
Write-Host "HRM <-> Subscription integration smoke test" -ForegroundColor Yellow
Write-Host "Repository: $Script:RepoRoot"
Write-Host ""

Import-DotEnvFile (Join-Path $Script:RepoRoot ".env")
Import-DotEnvFile (Join-Path $Script:RepoRoot "new-hrm\back\.env")

$Script:SubscriptionUrl = if ($SubscriptionUrl) { $SubscriptionUrl } else { Get-EnvValue "SUBSCRIPTION_API_BASE_URL" "http://127.0.0.1:3000" }
$Script:HrmUrl = if ($HrmUrl) { $HrmUrl } else { Get-EnvValue "HRM_PUBLIC_BASE_URL" "http://127.0.0.1:5000" }

Test-EnvAlignment
Test-ServiceHealth
Test-PlansEndpoint

$orgId = Ensure-OrganizationId
Test-FeatureCheck -OrgId $orgId
Test-TrialProvision -OrgId $orgId
Test-HrmProxy -OrgId $orgId
Test-OutboxInbound

Write-Host ""
Write-Host "Summary: $($Script:Passes.Count) passed, $($Script:Failures.Count) failed" -ForegroundColor Yellow

if ($Script:Failures.Count -gt 0) {
  Write-Host ""
  Write-Host "Failures:" -ForegroundColor Red
  $Script:Failures | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
  Write-Host ""
  Write-Host "Start services before re-running:" -ForegroundColor Yellow
  Write-Host "  cd Subscription; npm run dev"
  Write-Host "  cd Subscription; npm run worker"
  Write-Host "  cd new-hrm\back; npm run dev"
  exit 1
}

Write-Host ""
Write-Host "Integration smoke test passed." -ForegroundColor Green
exit 0