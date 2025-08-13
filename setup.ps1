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

# Create .claude directory if it doesn't exist
$claudeDir = "$env:USERPROFILE\.claude"
if (!(Test-Path $claudeDir)) {
    New-Item -ItemType Directory -Path $claudeDir -Force | Out-Null
}

# Create settings.json configuration for Windows
$mcpConfigPath = "$claudeDir\settings.json"
$serverPath = "$installDir\dist\index.js"

# Check if settings.json exists and back it up
if (Test-Path $mcpConfigPath) {
    Write-Host "Backing up existing settings.json to settings.json.backup" -ForegroundColor Yellow
    Copy-Item $mcpConfigPath "$mcpConfigPath.backup"
}

# Create the MCP configuration
$mcpConfig = @{
    mcpServers = @{
        sharex = @{
            command = "node"
            args = @($serverPath.Replace('\', '\\'))
            env = @{}
        }
    }
} | ConvertTo-Json -Depth 10

Set-Content -Path $mcpConfigPath -Value $mcpConfig
Write-Host "Created MCP configuration at: $mcpConfigPath" -ForegroundColor Green

Write-Host ""
Write-Host "Installation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Restart Claude Code to load the MCP server"
Write-Host "2. Take a screenshot with ShareX"
Write-Host "3. Tell Claude: 'look at my latest screenshot'"
Write-Host ""
Write-Host "Configuration file: $mcpConfigPath" -ForegroundColor Yellow
Write-Host "Server location: $serverPath" -ForegroundColor Yellow