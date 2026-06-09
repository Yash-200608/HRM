param(
    [ValidateSet('env', 'json')]
    [string]$Format = 'env'
)

function New-RandomSecret {
    param(
        [int]$Bytes = 32
    )
    $buffer = New-Object byte[] $Bytes
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($buffer)
    # Base64: 32 bytes -> 44 chars; hex: 64 chars. Both exceed the 32+ byte requirement.
    [Convert]::ToBase64String($buffer)
}

$accessTokenSecret = New-RandomSecret
$refreshTokenSecret = New-RandomSecret
$jwtSecret = New-RandomSecret
$adminJwtSecret = New-RandomSecret
$internalApiKey = New-RandomSecret -Bytes 48
$apiKeyPepper = New-RandomSecret
$passwordPepper = New-RandomSecret
$authTokenPepper = New-RandomSecret
$outboxDeliverySecret = New-RandomSecret

$secrets = [ordered]@{
    ACCESS_TOKEN_SECRET       = $accessTokenSecret
    REFRESH_TOKEN_SECRET      = $refreshTokenSecret
    HRM_ACCESS_TOKEN_SECRET   = $accessTokenSecret
    JWT_SECRET                = $jwtSecret
    ADMIN_JWT_SECRET          = $adminJwtSecret
    INTERNAL_API_KEY          = $internalApiKey
    API_KEY_PEPPER            = $apiKeyPepper
    PASSWORD_PEPPER           = $passwordPepper
    AUTH_TOKEN_PEPPER         = $authTokenPepper
    OUTBOX_DELIVERY_SECRET    = $outboxDeliverySecret
}

if ($Format -eq 'json') {
    $secrets | ConvertTo-Json
    exit 0
}

Write-Host '# Copy into .env - keep these private; do not commit.' -ForegroundColor Yellow
Write-Host ''
foreach ($entry in $secrets.GetEnumerator()) {
    Write-Host ("{0}={1}" -f $entry.Key, $entry.Value)
}
Write-Host ''
Write-Host '# HRM_ACCESS_TOKEN_SECRET is intentionally the same as ACCESS_TOKEN_SECRET.' -ForegroundColor DarkGray
Write-Host '# INTERNAL_API_KEY must match in both new-hrm/back and Subscription .env files.' -ForegroundColor DarkGray