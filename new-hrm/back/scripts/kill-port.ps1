param(
  [int]$Port = 5000
)

$listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue

if (-not $listeners) {
  Write-Host "No process is listening on port $Port."
  exit 0
}

$pids = $listeners.OwningProcess | Sort-Object -Unique

foreach ($processId in $pids) {
  try {
    $proc = Get-Process -Id $processId -ErrorAction Stop
    Stop-Process -Id $processId -Force
    Write-Host "Stopped $($proc.ProcessName) (PID $processId) on port $Port"
  }
  catch {
    Write-Host "Could not stop PID ${processId}: $($_.Exception.Message)"
  }
}

exit 0