# ShareX MCP Server One-Line Installer for Windows
# Run with: iwr -useb https://raw.githubusercontent.com/buildappolis/sharex-mcp-server/main/setup.ps1 | iex

$ErrorActionPreference = "Continue"

Write-Host "ShareX MCP Server Installer for Windows" -ForegroundColor Blue
Write-Host ""  

# Function to check and configure WSL
function Configure-WSL {
    param($ServerPath)
    
    Write-Host ""
    Write-Host "Checking for WSL installations..." -ForegroundColor Cyan
    
    # Get list of WSL distributions
    $wslDistros = @()
    try {
        $wslOutput = wsl --list --quiet 2>$null
        if ($wslOutput) {
            $wslDistros = $wslOutput | Where-Object { $_ -ne "" } | ForEach-Object { $_.Trim() -replace '\0', '' }
        }
    } catch {
        # WSL not installed or not available
    }
    
    if ($wslDistros.Count -eq 0) {
        Write-Host "No WSL distributions found" -ForegroundColor Gray
        return
    }
    
    Write-Host "Found WSL distributions: $($wslDistros -join ', ')" -ForegroundColor Green
    
    foreach ($distro in $wslDistros) {
        Write-Host ""
        Write-Host "Configuring $distro..." -ForegroundColor Yellow
        
        # Convert Windows path to WSL path
        $wslServerPath = $ServerPath -replace '\\', '/' -replace '^([A-Z]):', '/mnt/$1'.ToLower()
        
        # Check if Claude is installed in this WSL distro
        $claudeCheck = wsl -d $distro -- which claude 2>$null
        
        if ($claudeCheck) {
            Write-Host "  Claude Code found in $distro" -ForegroundColor Green
            
            # Register the MCP server in WSL
            Write-Host "  Registering ShareX MCP server..." -ForegroundColor Yellow
            
            # Remove existing registration
            wsl -d $distro -- claude mcp remove sharex 2>$null
            
            # Add new registration using the Windows installation
            $registerCmd = "claude mcp add sharex --scope user -- node '$wslServerPath'"
            wsl -d $distro -- bash -c $registerCmd 2>$null
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✓ Registered in $distro" -ForegroundColor Green
            } else {
                Write-Host "  ⚠ Could not auto-register in $distro" -ForegroundColor Yellow
                Write-Host "  Register manually in WSL with:" -ForegroundColor Yellow
                Write-Host "    claude mcp add sharex --scope user -- node '$wslServerPath'" -ForegroundColor White
            }
        } else {
            Write-Host "  Claude Code not found in $distro" -ForegroundColor Gray
            Write-Host "  After installing Claude in WSL, run:" -ForegroundColor Yellow  
            Write-Host "    claude mcp add sharex --scope user -- node '$wslServerPath'" -ForegroundColor White
        }
    }
}

# Check if Node.js is installed
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js is not installed. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check if pnpm is installed
if (!(Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "Installing pnpm..." -ForegroundColor Yellow
    npm install -g pnpm
}

# Create installation directory
$installDir = "$env:USERPROFILE\sharex-mcp-server"
Write-Host "Installing to: $installDir" -ForegroundColor Cyan

# Clone or download the repository
if (Test-Path $installDir) {
    Write-Host "Directory exists. Updating..." -ForegroundColor Yellow
    Set-Location $installDir
    try {
        git pull 2>$null
    } catch {
        Write-Host "Not a git repository, continuing..."
    }
} else {
    Write-Host "Downloading ShareX MCP Server..." -ForegroundColor Yellow
    
    # Download as ZIP to ensure we get the latest version
    $tempZip = "$env:TEMP\sharex-mcp-server.zip"
    Invoke-WebRequest -Uri "https://github.com/buildappolis/sharex-mcp-server/archive/refs/heads/main.zip" -OutFile $tempZip
    Expand-Archive -Path $tempZip -DestinationPath $env:USERPROFILE -Force
    Rename-Item "$env:USERPROFILE\sharex-mcp-server-main" $installDir -Force
    Remove-Item $tempZip
    
    Set-Location $installDir
}

# Install dependencies and build
Write-Host "Installing dependencies..." -ForegroundColor Yellow
pnpm install

Write-Host "Building project..." -ForegroundColor Yellow
pnpm build

# Configure MCP for Claude Code
Write-Host "Configuring Claude Code..." -ForegroundColor Yellow

$serverPath = "$installDir\dist\index.js"

# Check if Claude Code is installed
if (Get-Command claude -ErrorAction SilentlyContinue) {
    Write-Host "Registering ShareX MCP server with Claude Code..." -ForegroundColor Yellow
    
    # Remove existing ShareX server if it exists
    claude mcp remove sharex 2>$null
    
    # Add the ShareX MCP server using stdio transport
    # On Windows, we need to use cmd /c wrapper for proper execution
    claude mcp add sharex --scope user -- cmd /c node "$serverPath"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "ShareX MCP server registered successfully!" -ForegroundColor Green
    } else {
        Write-Host "Warning: Failed to register MCP server automatically" -ForegroundColor Yellow
        Write-Host "You can register it manually later with:" -ForegroundColor Yellow
        Write-Host "  claude mcp add sharex --scope user -- cmd /c node `"$serverPath`"" -ForegroundColor White
    }
} else {
    Write-Host "Claude Code not found in PATH" -ForegroundColor Yellow
    Write-Host "After installing Claude Code, register the MCP server with:" -ForegroundColor Yellow
    Write-Host "  claude mcp add sharex --scope user -- cmd /c node `"$serverPath`"" -ForegroundColor White
}

# Configure WSL if present
Configure-WSL -ServerPath $serverPath

Write-Host ""
Write-Host "Installation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Restart Claude Code (both Windows and WSL if applicable)"
Write-Host "2. Take a screenshot with ShareX"
Write-Host "3. Tell Claude: 'look at my latest screenshot'"
Write-Host ""
Write-Host "Server location: $serverPath" -ForegroundColor Yellow
Write-Host ""
Write-Host "To verify the MCP server is working:" -ForegroundColor Yellow
Write-Host "  Windows: claude mcp list" -ForegroundColor White
Write-Host "  WSL: wsl -- claude mcp list" -ForegroundColor White