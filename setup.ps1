# ShareX MCP Server One-Line Installer for Windows
# Run with: iwr -useb https://raw.githubusercontent.com/hellocory/sharex-mcp-server/main/setup.ps1 | iex

$ErrorActionPreference = "Continue"

Write-Host "ShareX MCP Server Installer" -ForegroundColor Blue
Write-Host ""

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
    Invoke-WebRequest -Uri "https://github.com/hellocory/sharex-mcp-server/archive/refs/heads/main.zip" -OutFile $tempZip
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

Write-Host ""
Write-Host "Installation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Restart Claude Code to load the MCP server"
Write-Host "2. Take a screenshot with ShareX"
Write-Host "3. Tell Claude: 'look at my latest screenshot'"
Write-Host ""
Write-Host "Server location: $serverPath" -ForegroundColor Yellow
Write-Host ""
Write-Host "To verify the MCP server is working:" -ForegroundColor Yellow
Write-Host "  claude mcp list" -ForegroundColor White