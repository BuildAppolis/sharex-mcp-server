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

# Configure for Claude Code in WSL
echo ""
echo "Configuring Claude Code for WSL..."

# Create .claude directory if it doesn't exist
CLAUDE_DIR="$HOME/.claude"
mkdir -p "$CLAUDE_DIR"

# Claude settings path in WSL
MCP_CONFIG_PATH="$CLAUDE_DIR/settings.json"

# Check if settings.json exists and back it up
if [ -f "$MCP_CONFIG_PATH" ]; then
    echo "Backing up existing settings.json to settings.json.backup"
    cp "$MCP_CONFIG_PATH" "$MCP_CONFIG_PATH.backup"
    
    # Read existing settings and merge MCP configuration
    if command -v jq &> /dev/null; then
        # If jq is available, merge properly
        jq --arg cmd "node" \
           --arg path "${INSTALL_DIR}/dist/index.js" \
           '.mcpServers.sharex = {"command": $cmd, "args": [$path], "env": {}}' \
           "$MCP_CONFIG_PATH.backup" > "$MCP_CONFIG_PATH"
    else
        # Manual merge - just overwrite with MCP server config preserved
        echo "Note: jq not found, creating new settings with MCP server config"
        cat > "$MCP_CONFIG_PATH" << EOF
{
  "mcpServers": {
    "sharex": {
      "command": "node",
      "args": ["${INSTALL_DIR}/dist/index.js"],
      "env": {}
    }
  }
}
EOF
    fi
else
    # Create new settings.json
    cat > "$MCP_CONFIG_PATH" << EOF
{
  "mcpServers": {
    "sharex": {
      "command": "node",
      "args": ["${INSTALL_DIR}/dist/index.js"],
      "env": {}
    }
  }
}
EOF
fi

echo "✓ Created MCP configuration at: $MCP_CONFIG_PATH"

# Also create a Windows-compatible version if needed
WIN_INSTALL_DIR=$(wsl_to_windows_path "$INSTALL_DIR")
WIN_CLAUDE_DIR="${WSL_USER_PROFILE}/.claude"
WIN_MCP_CONFIG="${WIN_CLAUDE_DIR}/settings.json"

# Create Windows .claude directory through WSL
mkdir -p "$WIN_CLAUDE_DIR"

# Check if Windows settings.json exists and back it up
if [ -f "$WIN_MCP_CONFIG" ]; then
    echo "Backing up existing Windows settings.json"
    cp "$WIN_MCP_CONFIG" "$WIN_MCP_CONFIG.backup"
fi

# Create Windows version through WSL
cat > "$WIN_MCP_CONFIG" << EOF
{
  "mcpServers": {
    "sharex": {
      "command": "node",
      "args": ["${WIN_INSTALL_DIR}\\dist\\index.js"],
      "env": {}
    }
  }
}
EOF

echo "✓ Created Windows MCP configuration at: $WIN_MCP_CONFIG"

echo ""
echo -e "\033[32m✅ Installation complete!\033[0m"
echo ""
echo -e "\033[36mNext steps:\033[0m"
echo "1. Restart Claude Code to load the MCP server"
echo "2. Take a screenshot with ShareX (on Windows)"
echo "3. Tell Claude: \"look at my latest screenshot\""
echo ""
echo -e "\033[33mConfiguration files created:\033[0m"
echo "  WSL:     $MCP_CONFIG_PATH"
echo "  Windows: $(wsl_to_windows_path "$WIN_MCP_CONFIG")"
echo ""
echo "The MCP server will run from: $INSTALL_DIR"