#!/bin/bash

# ShareX MCP Server Installer for WSL/Linux
# This script installs the MCP server on Windows and configures it for WSL

set -e

echo -e "\033[34m🚀 ShareX MCP Server Installer (WSL/Linux)\033[0m"
echo ""

# Detect if we're in WSL
if grep -q microsoft /proc/version 2>/dev/null; then
    echo "✓ WSL environment detected"
    IS_WSL=true
else
    echo "⚠ Not running in WSL - this installer is designed for WSL environments"
    echo "  For native Windows, use: setup.ps1"
    exit 1
fi

# Function to convert WSL path to Windows path
wsl_to_windows_path() {
    local wsl_path="$1"
    if [[ "$wsl_path" =~ ^/mnt/([a-z])(/.*)?$ ]]; then
        local drive="${BASH_REMATCH[1]^^}"
        local path="${BASH_REMATCH[2]}"
        echo "${drive}:${path//\//\\}"
    else
        echo "$wsl_path"
    fi
}

# Function to convert Windows path to WSL path
windows_to_wsl_path() {
    local win_path="$1"
    if [[ "$win_path" =~ ^([A-Za-z]):(.*) ]]; then
        local drive="${BASH_REMATCH[1],,}"
        local path="${BASH_REMATCH[2]//\\//}"
        echo "/mnt/${drive}${path}"
    else
        echo "$win_path"
    fi
}

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed in WSL"
    echo "   Please install Node.js first:"
    echo "   curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -"
    echo "   sudo apt-get install -y nodejs"
    exit 1
fi

# Check for pnpm
if ! command -v pnpm &> /dev/null; then
    echo "Installing pnpm..."
    npm install -g pnpm
fi

# Determine Windows user directory through WSL
WIN_USER_PROFILE=$(cmd.exe /c "echo %USERPROFILE%" 2>/dev/null | tr -d '\r')
WSL_USER_PROFILE=$(windows_to_wsl_path "$WIN_USER_PROFILE")

# Default installation directory on Windows side
DEFAULT_INSTALL_DIR="${WSL_USER_PROFILE}/sharex-mcp-server"

# Check if we're already in the sharex-mcp-server directory
CURRENT_DIR=$(pwd)
if [[ "$CURRENT_DIR" == *"sharex-mcp-server"* ]]; then
    echo "Using current directory: $CURRENT_DIR"
    INSTALL_DIR="$CURRENT_DIR"
else
    # Ask user for installation directory
    echo "Default installation directory: $DEFAULT_INSTALL_DIR"
    read -p "Press Enter to use default or specify a custom path: " CUSTOM_PATH
    
    if [ -z "$CUSTOM_PATH" ]; then
        INSTALL_DIR="$DEFAULT_INSTALL_DIR"
    else
        INSTALL_DIR="$CUSTOM_PATH"
    fi
fi

# Create or update installation
if [ -d "$INSTALL_DIR" ]; then
    echo "Directory exists. Updating..."
    cd "$INSTALL_DIR"
    
    # Check if it's a git repository
    if [ -d .git ]; then
        echo "Pulling latest changes..."
        git pull
    fi
else
    echo "Creating installation directory..."
    mkdir -p "$INSTALL_DIR"
    
    echo "Downloading ShareX MCP Server..."
    cd "$(dirname "$INSTALL_DIR")"
    
    # Download and extract
    curl -L -o /tmp/sharex-mcp-server.zip https://github.com/hellocory/sharex-mcp-server/archive/refs/heads/main.zip
    unzip -q /tmp/sharex-mcp-server.zip
    mv sharex-mcp-server-main "$INSTALL_DIR"
    rm /tmp/sharex-mcp-server.zip
    
    cd "$INSTALL_DIR"
fi

echo ""
echo "Installing dependencies..."
pnpm install

echo ""
echo "Building project..."
pnpm build

# Configure for Claude Code
echo ""
echo "Configuring Claude Code..."

# Check if Claude Code is installed
if command -v claude &> /dev/null; then
    echo "Registering ShareX MCP server with Claude Code..."
    
    # Remove existing ShareX server if it exists
    claude mcp remove sharex 2>/dev/null || true
    
    # Add the ShareX MCP server using stdio transport
    claude mcp add sharex --scope user -- node "${INSTALL_DIR}/dist/index.js"
    
    if [ $? -eq 0 ]; then
        echo "✓ ShareX MCP server registered successfully!"
    else
        echo "⚠ Warning: Failed to register MCP server automatically"
        echo "  You can register it manually later with:"
        echo "  claude mcp add sharex --scope user -- node \"${INSTALL_DIR}/dist/index.js\""
    fi
else
    echo "⚠ Claude Code not found in PATH"
    echo "  After installing Claude Code, register the MCP server with:"
    echo "  claude mcp add sharex --scope user -- node \"${INSTALL_DIR}/dist/index.js\""
fi

# Also register for Windows if we're in WSL and Windows Claude is available
if [ "$IS_WSL" = true ]; then
    WIN_INSTALL_DIR=$(wsl_to_windows_path "$INSTALL_DIR")
    
    # Try to register with Windows Claude through cmd.exe
    if cmd.exe /c "where claude" &>/dev/null 2>&1; then
        echo ""
        echo "Registering with Windows Claude Code..."
        cmd.exe /c "claude mcp remove sharex" 2>/dev/null || true
        cmd.exe /c "claude mcp add sharex --scope user -- cmd /c node \"${WIN_INSTALL_DIR}\\dist\\index.js\"" 2>/dev/null
        
        if [ $? -eq 0 ]; then
            echo "✓ Registered with Windows Claude Code"
        else
            echo "⚠ Could not register with Windows Claude automatically"
            echo "  Register manually in Windows with:"
            echo "  claude mcp add sharex --scope user -- cmd /c node \"${WIN_INSTALL_DIR}\\dist\\index.js\""
        fi
    fi
fi

echo ""
echo -e "\033[32m✅ Installation complete!\033[0m"
echo ""
echo -e "\033[36mNext steps:\033[0m"
echo "1. Restart Claude Code to load the MCP server"
echo "2. Take a screenshot with ShareX (on Windows)"
echo "3. Tell Claude: \"look at my latest screenshot\""
echo ""
echo "The MCP server is installed at: $INSTALL_DIR"
echo ""
echo "To verify the MCP server is working:"
echo "  claude mcp list"