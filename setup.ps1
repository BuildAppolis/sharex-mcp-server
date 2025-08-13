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
    
    # Try git clone first
    $gitSuccess = $false
    if (Get-Command git -ErrorAction SilentlyContinue) {
        Start-Process -FilePath "git" -ArgumentList "clone", "https://github.com/hellocory/sharex-mcp-server.git", $installDir -NoNewWindow -Wait -RedirectStandardOutput "$env:TEMP\git-out.txt" -RedirectStandardError "$env:TEMP\git-err.txt"
        if (Test-Path "$installDir\.git") {
            $gitSuccess = $true
        }
        Remove-Item "$env:TEMP\git-out.txt" -ErrorAction SilentlyContinue
        Remove-Item "$env:TEMP\git-err.txt" -ErrorAction SilentlyContinue
    }
    
    if (-not $gitSuccess) {
        # Fallback to downloading as zip
        Write-Host "Git not available, downloading as ZIP..." -ForegroundColor Yellow
        $tempZip = "$env:TEMP\sharex-mcp-server.zip"
        Invoke-WebRequest -Uri "https://github.com/hellocory/sharex-mcp-server/archive/refs/heads/main.zip" -OutFile $tempZip
        Expand-Archive -Path $tempZip -DestinationPath $env:USERPROFILE -Force
        Rename-Item "$env:USERPROFILE\sharex-mcp-server-main" $installDir -Force
        Remove-Item $tempZip
    }
    
    Set-Location $installDir
}

# Install dependencies and build
Write-Host "Installing dependencies..." -ForegroundColor Yellow
pnpm install

Write-Host "Building project..." -ForegroundColor Yellow
pnpm build

# Run the CLI installer
Write-Host "Running configuration..." -ForegroundColor Yellow
node dist/cli.js install

Write-Host ""
Write-Host "Installation complete!" -ForegroundColor Green
Write-Host "ShareX MCP Server has been installed and configured." -ForegroundColor Green