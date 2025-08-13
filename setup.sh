#!/bin/bash
# ShareX MCP Server One-Line Installer for Unix/WSL
# Run with: curl -sSL https://raw.githubusercontent.com/yourusername/sharex-mcp-server/main/setup.sh | bash

set -e

echo -e "\033[34mShareX MCP Server Installer\033[0m"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "\033[31mNode.js is not installed. Please install Node.js first.\033[0m"
    exit 1
fi

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo -e "\033[33mInstalling pnpm...\033[0m"
    npm install -g pnpm
fi

# Create installation directory
INSTALL_DIR="$HOME/sharex-mcp-server"
echo -e "\033[36mInstalling to: $INSTALL_DIR\033[0m"

# Clone or download the repository
if [ -d "$INSTALL_DIR" ]; then
    echo -e "\033[33mDirectory exists. Updating...\033[0m"
    cd "$INSTALL_DIR"
    git pull 2>/dev/null || echo "Not a git repository, continuing..."
else
    echo -e "\033[33mDownloading ShareX MCP Server...\033[0m"
    git clone https://github.com/yourusername/sharex-mcp-server.git "$INSTALL_DIR" 2>/dev/null || {
        # Fallback to downloading as tar.gz
        temp_tar="/tmp/sharex-mcp-server.tar.gz"
        curl -L "https://github.com/yourusername/sharex-mcp-server/archive/main.tar.gz" -o "$temp_tar"
        mkdir -p "$INSTALL_DIR"
        tar -xzf "$temp_tar" -C "$INSTALL_DIR" --strip-components=1
        rm "$temp_tar"
    }
    cd "$INSTALL_DIR"
fi

# Install dependencies and build
echo -e "\033[33mInstalling dependencies...\033[0m"
pnpm install

echo -e "\033[33mBuilding project...\033[0m"
pnpm build

# Run the CLI installer
echo -e "\033[33mRunning configuration...\033[0m"
node dist/cli.js install

echo ""
echo -e "\033[32mInstallation complete!\033[0m"
echo -e "\033[32mShareX MCP Server has been installed and configured.\033[0m"