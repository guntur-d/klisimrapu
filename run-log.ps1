# PowerShell script to run server with log management
# This script will limit the log file to last 100 lines

param(
    [string]$env = "dev"
)

# Setup script directory and paths
$ScriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

$CleanupLog = Join-Path $ScriptDir 'port_cleanup.log'
$LogFile    = Join-Path $ScriptDir 'server.log'

# Helper function for timestamped logging
function Log {
    param([string]$Message)
    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Add-Content -Path $CleanupLog -Value "[$timestamp] $Message"
}

# Function to trim log file to last 100 lines
function Set-LogFileTail {
    param([string]$logfile)

    if (Test-Path $logfile) {
        $lines = Get-Content $logfile -ErrorAction SilentlyContinue
        if ($lines.Count -gt 100) {
            $lines | Select-Object -Last 100 | Set-Content $logfile
        }
    }
}

# Clean up existing log files
Remove-Item -Path $LogFile -ErrorAction SilentlyContinue
Remove-Item -Path $CleanupLog -ErrorAction SilentlyContinue

# Log script start
Log 'Starting server startup script'

# Kill any existing nodemon processes
Log 'Killing any existing nodemon processes'
$nodemonProcesses = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*nodemon*' } -ErrorAction SilentlyContinue
if ($nodemonProcesses) {
    foreach ($proc in $nodemonProcesses) {
        try {
            Stop-Process -Id $proc.ProcessId -Force -ErrorAction Stop
            Log "Killed nodemon process (PID $($proc.ProcessId))"
            Write-Host "Killed nodemon process (PID $($proc.ProcessId))" -ForegroundColor Green
        }
        catch {
            Log "Failed to kill nodemon process (PID $($proc.ProcessId)): $_"
            Write-Host "Failed to kill nodemon process (PID $($proc.ProcessId))" -ForegroundColor Red
        }
    }
} else {
    Log 'No nodemon processes found'
    Write-Host 'No nodemon processes found' -ForegroundColor DarkGray
}

# Port cleanup configuration
$ExemptPort = 121214
$PortStart  = 3000
$PortEnd    = 3010

Log 'Starting port cleanup'
Log "Exempting port $ExemptPort"
Write-Host '--- Port Cleanup Starting ---' -ForegroundColor Cyan

for ($p = $PortStart; $p -le $PortEnd; $p++) {
    if ($p -eq $ExemptPort) {
        Log "Port $p skipped (exempt)"
        Write-Host "Port $p skipped (exempt)" -ForegroundColor Yellow
    }
    else {
        $listeners = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
        if ($null -ne $listeners) {
            foreach ($conn in $listeners) {
                $owningPid = $conn.OwningProcess
                try {
                    Stop-Process -Id $owningPid -Force -ErrorAction Stop
                    Log "Cleared port $p (PID $owningPid)"
                    Write-Host "Port $p cleared (PID $owningPid)" -ForegroundColor Green
                }
                catch {
                    Log "Failed to clear port $p (PID $owningPid): $_"
                    Write-Host "Failed to clear port $p (PID $owningPid)" -ForegroundColor Red
                }
            }
        }
        else {
            Log "Port $p already clean"
            Write-Host "Port $p already clean" -ForegroundColor DarkGray
        }
    }
}

Log 'Port cleanup complete'
Write-Host '--- Port Cleanup Complete ---' -ForegroundColor Cyan
Write-Host ''

Write-Host "Starting Node.js development server with nodemon"
Write-Host "Log file: server.log (limited to last 100 lines)"
Write-Host "Press CTRL+C to stop the server"
Write-Host "----------------------------------------"

# Create initial log entry
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
"$timestamp`: Server starting" | Out-File -FilePath $LogFile -Append

# Start a background job to periodically trim the log file
$job = Start-Job -ScriptBlock {
    param($logFile)
    while ($true) {
        Start-Sleep -Seconds 10
        if (Test-Path $logFile) {
            $lines = Get-Content $logFile -ErrorAction SilentlyContinue
            if ($lines.Count -gt 100) {
                $lines | Select-Object -Last 100 | Set-Content $logFile
            }
        }
    }
} -ArgumentList $LogFile

try {
    # Run nodemon server.js and capture output
    nodemon server.js 2>&1 | ForEach-Object {
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        "$timestamp`: $_" | Out-File -FilePath $LogFile -Append
        Write-Host "$timestamp`: $_"
    }

} finally {
    # Stop the background job when server stops
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp`: Server stopped" | Out-File -FilePath $LogFile -Append
    
    if (Get-Job -Id $job.Id -ErrorAction SilentlyContinue) {
        Stop-Job $job
        Remove-Job $job
    }
    
    Log 'Server stopped and cleanup completed'
}