#!/bin/bash

# ShareX MCP Server WSL Installer
# This script configures WSL to connect to the Windows-installed ShareX MCP server

set -e

echo -e "\033[34m🚀 ShareX MCP Server WSL Configuration\033[0m"
echo ""

# Verify we're in WSL
if ! grep -q microsoft /proc/version 2>/dev/null; then
    echo "❌ This script is designed for WSL (Windows Subsystem for Linux)"
    echo "   For native Linux, use: ./install-linux.sh"
    exit 1
fi

echo "✓ WSL environment detected"
echo ""

# Function to convert Windows path to WSL path
windows_to_wsl_path() {
    local win_path="$1"
    if [[ "$win_path" =~ ^([A-Za-z]):(.*)$ ]]; then
        local drive="${BASH_REMATCH[1],,}"
        local path="${BASH_REMATCH[2]//\\//}"
        echo "/mnt/${drive}${path}"
    else
        echo "$win_path"
    fi
}

# Check if ShareX MCP server is installed on Windows
echo "Checking for Windows installation..."

# Get Windows Program Files paths
WIN_PROGRAMFILES=$(cmd.exe /c "echo %PROGRAMFILES%" 2>/dev/null | tr -d '\r')
WIN_PROGRAMFILES_X86=$(cmd.exe /c "echo %PROGRAMFILES(X86)%" 2>/dev/null | tr -d '\r')
WIN_USERPROFILE=$(cmd.exe /c "echo %USERPROFILE%" 2>/dev/null | tr -d '\r')
WIN_APPDATA=$(cmd.exe /c "echo %APPDATA%" 2>/dev/null | tr -d '\r')

# Convert to WSL paths
WSL_USERPROFILE=$(windows_to_wsl_path "$WIN_USERPROFILE")
WSL_APPDATA=$(windows_to_wsl_path "$WIN_APPDATA")

# Common installation locations on Windows
POSSIBLE_PATHS=(
    "${WSL_USERPROFILE}/sharex-mcp-server"
    "${WSL_USERPROFILE}/.sharex-mcp-server"
    "${WSL_APPDATA}/sharex-mcp-server"
    "${WSL_USERPROFILE}/AppData/Local/Programs/sharex-mcp-server"
    "/mnt/c/Program Files/ShareX-MCP-Server"
    "/mnt/c/Program Files (x86)/ShareX-MCP-Server"
)

# Find the Windows installation
WINDOWS_INSTALL=""
for path in "${POSSIBLE_PATHS[@]}"; do
    if [ -f "$path/dist/index.js" ]; then
        WINDOWS_INSTALL="$path"
        echo "✓ Found Windows installation at: $WINDOWS_INSTALL"
        break
    fi
done

if [ -z "$WINDOWS_INSTALL" ]; then
    echo ""
    echo "⚠️  ShareX MCP Server not found on Windows"
    echo ""
    echo "Please install on Windows first:"
    echo "1. Open PowerShell on Windows (not WSL)"
    echo "2. Run: irm https://raw.githubusercontent.com/buildappolis/sharex-mcp-server/main/setup.ps1 | iex"
    echo ""
    echo "Or manually specify the Windows installation path:"
    read -p "Enter Windows path (or press Enter to exit): " CUSTOM_PATH
    
    if [ -z "$CUSTOM_PATH" ]; then
        exit 1
    fi
    
    WINDOWS_INSTALL=$(windows_to_wsl_path "$CUSTOM_PATH")
    
    if [ ! -f "$WINDOWS_INSTALL/dist/index.js" ]; then
        echo "❌ Invalid path: $WINDOWS_INSTALL/dist/index.js not found"
        exit 1
    fi
fi

# Check if Claude Code is installed in WSL
if ! command -v claude &> /dev/null; then
    echo ""
    echo "⚠️  Claude Code not found in WSL"
    echo ""
    echo "Install Claude Code in WSL first:"
    echo "  Visit: https://claude.ai/code"
    echo ""
    read -p "Continue anyway? (y/N): " CONTINUE
    if [[ ! "$CONTINUE" =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Register the Windows MCP server with WSL's Claude Code
echo ""
echo "Configuring Claude Code in WSL..."

# Check if Node.js is installed in WSL
if ! command -v node &> /dev/null; then
    echo "Installing Node.js in WSL..."
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Register with Claude Code
if command -v claude &> /dev/null; then
    echo "Registering ShareX MCP server with Claude Code..."
    
    # Remove existing registration
    claude mcp remove sharex 2>/dev/null || true
    
    # Add the Windows server
    # Use the WSL path to the Windows installation
    claude mcp add sharex --scope user -- node "${WINDOWS_INSTALL}/dist/index.js"
    
    if [ $? -eq 0 ]; then
        echo "✓ ShareX MCP server registered successfully!"
    else
        echo "⚠️  Failed to register automatically"
        echo ""
        echo "Register manually with:"
        echo "  claude mcp add sharex --scope user -- node \"${WINDOWS_INSTALL}/dist/index.js\""
    fi
else
    echo ""
    echo "After installing Claude Code in WSL, register the server with:"
    echo "  claude mcp add sharex --scope user -- node \"${WINDOWS_INSTALL}/dist/index.js\""
fi

# Create convenience script
echo ""
echo "Creating convenience commands..."

USER_BIN="${HOME}/.local/bin"
mkdir -p "$USER_BIN"

# Create wrapper script for easy access
cat > "$USER_BIN/sharex-mcp" << EOF
#!/bin/bash
# ShareX MCP Server wrapper for WSL
# This connects to the Windows-installed server

WINDOWS_INSTALL="${WINDOWS_INSTALL}"

case "\$1" in
    status)
        if claude mcp list 2>/dev/null | grep -q sharex; then
            echo "✅ ShareX MCP server is registered"
            claude mcp list | grep sharex
        else
            echo "❌ ShareX MCP server is not registered"
            echo "Run: sharex-mcp register"
        fi
        ;;
    register)
        echo "Registering ShareX MCP server..."
        claude mcp remove sharex 2>/dev/null || true
        claude mcp add sharex --scope user -- node "\${WINDOWS_INSTALL}/dist/index.js"
        echo "✓ Done. Restart Claude Code to apply changes."
        ;;
    unregister)
        echo "Unregistering ShareX MCP server..."
        claude mcp remove sharex
        ;;
    test)
        echo "Testing ShareX MCP server..."
        node "\${WINDOWS_INSTALL}/dist/index.js" --version
        ;;
    path)
        echo "Windows installation: \${WINDOWS_INSTALL}"
        echo "ShareX screenshots: \$(cmd.exe /c "echo %USERPROFILE%\\Documents\\ShareX\\Screenshots" 2>/dev/null | tr -d '\r')"
        ;;
    *)
        echo "ShareX MCP Server for WSL"
        echo ""
        echo "Usage: sharex-mcp [command]"
        echo ""
        echo "Commands:"
        echo "  status      Check if server is registered"
        echo "  register    Register with Claude Code"
        echo "  unregister  Remove from Claude Code"
        echo "  test        Test the server connection"
        echo "  path        Show installation paths"
        ;;
esac
EOF

chmod +x "$USER_BIN/sharex-mcp"

# Add to PATH if needed
if [[ ":$PATH:" != *":$USER_BIN:"* ]]; then
    echo ""
    echo "Adding $USER_BIN to PATH..."
    
    # Detect shell and update appropriate config
    if [ -n "$ZSH_VERSION" ]; then
        SHELL_CONFIG="$HOME/.zshrc"
    elif [ -n "$BASH_VERSION" ]; then
        SHELL_CONFIG="$HOME/.bashrc"
    else
        SHELL_CONFIG="$HOME/.profile"
    fi
    
    echo "export PATH=\"\$PATH:$USER_BIN\"" >> "$SHELL_CONFIG"
    export PATH="$PATH:$USER_BIN"
    
    echo "✓ Added to PATH (restart terminal or run: source $SHELL_CONFIG)"
fi

echo ""
echo -e "\033[32m✅ WSL configuration complete!\033[0m"
echo ""
echo -e "\033[36mNext steps:\033[0m"
echo "1. Restart Claude Code in WSL"
echo "2. Take a screenshot with ShareX on Windows"
echo "3. In Claude Code (WSL), say: \"look at my latest screenshot\""
echo ""
echo "Available commands:"
echo "  sharex-mcp status    - Check registration status"
echo "  sharex-mcp register  - Re-register with Claude Code"
echo "  sharex-mcp path      - Show installation paths"
echo ""
echo "The Windows MCP server at:"
echo "  $WINDOWS_INSTALL"
echo "will handle all screenshot operations."