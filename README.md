# ShareX MCP Server

An MCP (Model Context Protocol) server that bridges ShareX screenshots from Windows to WSL environments, enabling seamless media sharing for AI assistants.

## Architecture

### Components

1. **ShareX (Windows)** - Screenshot capture tool that saves images/GIFs
2. **MCP Server (Windows)** - Runs on Windows, monitors ShareX screenshot directory
3. **Claude Code** - Can run on Windows or WSL, connects to the MCP server
4. **MCP Tools** - Provides tools like `check_latest_screenshots` and `check_latest_gif`

### Features

- Real-time screenshot monitoring
- Support for images (PNG, JPG) and GIFs
- Metadata tracking (timestamp, dimensions, file size)
- Efficient caching and retrieval
- WSL-accessible endpoints

## Quick Installation

The MCP server runs on Windows (where ShareX is installed) and can be accessed from both Windows and WSL environments.

### For Windows Users

#### One-Line Install (PowerShell)
```powershell
iwr -useb https://raw.githubusercontent.com/hellocory/sharex-mcp-server/main/setup.ps1 | iex
```

This will:
- Install the MCP server in `%USERPROFILE%\sharex-mcp-server`
- Configure Claude Code automatically
- Create `.mcp.json` in your Windows user directory

### For WSL Users

#### One-Line Install (Bash)
```bash
curl -fsSL https://raw.githubusercontent.com/hellocory/sharex-mcp-server/main/install.sh | bash
```

This will:
- Install the MCP server on your Windows filesystem (accessible from WSL)
- Configure Claude Code for both WSL and Windows
- Create `.mcp.json` in both WSL home and Windows user directory

### Manual Installation

#### Windows (PowerShell)
```powershell
# Clone the repository
git clone https://github.com/hellocory/sharex-mcp-server.git
cd sharex-mcp-server

# Install dependencies
pnpm install

# Build
pnpm build

# Configure MCP
$mcpConfig = @{
    mcpServers = @{
        sharex = @{
            command = "node"
            args = @("$PWD\dist\index.js")
            env = @{}
        }
    }
} | ConvertTo-Json -Depth 10

Set-Content -Path "$env:USERPROFILE\.mcp.json" -Value $mcpConfig
```

#### WSL (Bash)
```bash
# Navigate to Windows filesystem
cd /mnt/c/Users/$USER

# Clone the repository
git clone https://github.com/hellocory/sharex-mcp-server.git
cd sharex-mcp-server

# Install dependencies
pnpm install

# Build
pnpm build

# Configure MCP for WSL
cat > ~/.mcp.json << EOF
{
  "mcpServers": {
    "sharex": {
      "command": "node",
      "args": ["$(pwd)/dist/index.js"],
      "env": {}
    }
  }
}
EOF
```

## Cross-Platform Compatibility

### Windows + WSL Setup

The ShareX MCP Server is designed to work seamlessly across Windows and WSL environments:

1. **ShareX** runs on Windows and captures screenshots
2. **MCP Server** runs on Windows (installed in Windows filesystem)
3. **Claude Code** can run on either:
   - **Windows**: Uses native Windows paths in `.mcp.json`
   - **WSL**: Uses WSL-mounted paths (e.g., `/mnt/c/...`) in `.mcp.json`

Both environments access the same MCP server instance running on Windows, ensuring consistent screenshot access regardless of where Claude Code is running.

### Path Mapping

The installers automatically handle path conversion:
- Windows: `C:\Users\YourName\sharex-mcp-server\dist\index.js`
- WSL: `/mnt/c/Users/YourName/sharex-mcp-server/dist/index.js`

## Configuration

### How It Works

The ShareX MCP Server reads screenshots directly from your existing ShareX folder without modifying or moving them. It maintains a cache of the most recent screenshots (default: 10 images, 5 GIFs) and automatically removes older entries from its cache when limits are reached.

### Environment Variables

You can configure the server behavior using environment variables:

```bash
# Maximum number of recent images to track (default: 10)
SHAREX_MAX_IMAGES=10

# Maximum number of recent GIFs to track (default: 5)
SHAREX_MAX_GIFS=5

# Custom ShareX screenshots path (auto-detected by default)
SHAREX_PATH="C:/Users/YourName/Documents/ShareX/Screenshots"

# Disable auto-detection of ShareX path
SHAREX_AUTO_DETECT=false
```

### Claude Code Configuration

After installation, add the MCP server to your Claude Code settings:

**Windows** (`%USERPROFILE%\.claude\settings.json`):
```json
{
  "mcpServers": {
    "sharex": {
      "command": "node",
      "args": ["C:/Users/YourName/sharex-mcp-server/dist/index.js"],
      "env": {
        "SHAREX_MAX_IMAGES": "10",
        "SHAREX_MAX_GIFS": "5"
      }
    }
  }
}
```

**WSL/Linux** (`~/.claude/settings.json`):
```json
{
  "mcpServers": {
    "sharex": {
      "command": "node",
      "args": ["/mnt/c/Users/YourName/sharex-mcp-server/dist/index.js"],
      "env": {
        "SHAREX_MAX_IMAGES": "10",
        "SHAREX_MAX_GIFS": "5"
      }
    }
  }
}
```

## MCP Tools Available

### `check_latest_screenshots`
Get the most recent screenshots (up to 5)

**Parameters:**
- `count` (optional): Number of screenshots to retrieve (1-5, default: 1)

**Example:**
```
"look at my latest screenshot"
"show me the last 3 screenshots"
```

### `check_latest_gif`
Get the most recent GIF file

**Example:**
```
"look at my latest gif"
"show me the most recent gif"
```

### `get_screenshot_by_name`
Retrieve a specific screenshot by filename

**Parameters:**
- `filename` (required): The filename of the screenshot

**Example:**
```
"get screenshot named 'example.png'"
```

### `list_screenshots`
List all available screenshots with metadata

**Parameters:**
- `limit` (optional): Maximum number of screenshots to list (default: 20)

**Example:**
```
"list all my screenshots"
"show me available screenshots"
```

## Troubleshooting

### Server not detecting screenshots
1. Ensure ShareX is saving to the correct directory
2. Check file permissions on the screenshots folder
3. Verify the server is running and watching the directory

### WSL connection issues
1. Ensure the Windows path is correctly mapped to WSL (e.g., `D:` → `/mnt/d`)
2. Check that Node.js is accessible from WSL
3. Verify the MCP server configuration in Claude Code settings