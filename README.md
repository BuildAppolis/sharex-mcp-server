# ShareX MCP Server

An MCP (Model Context Protocol) server that bridges ShareX screenshots from Windows to WSL environments, enabling seamless media sharing for AI assistants.

## Architecture

### Components

1. **MCP Server (Windows)** - Runs on Windows host, monitors ShareX screenshot directory
2. **ShareX Configuration** - Auto-saves screenshots to `D:/Coding/BuildAppolis/sharex-mcp-server/screenshots`
3. **MCP Tools** - Provides tools like `check_latest_screenshots` and `check_latest_gif`

### Features

- Real-time screenshot monitoring
- Support for images (PNG, JPG) and GIFs
- Metadata tracking (timestamp, dimensions, file size)
- Efficient caching and retrieval
- WSL-accessible endpoints

## Quick Installation

### One-Line Install (Windows PowerShell)
```powershell
iwr -useb https://raw.githubusercontent.com/yourusername/sharex-mcp-server/main/setup.ps1 | iex
```

### One-Line Install (WSL/Linux/macOS)
```bash
curl -sSL https://raw.githubusercontent.com/yourusername/sharex-mcp-server/main/setup.sh | bash
```

### NPX Install (Cross-platform)
```bash
npx sharex-mcp-server init
```

### Manual Installation
```bash
# Clone the repository
git clone https://github.com/yourusername/sharex-mcp-server.git
cd sharex-mcp-server

# Install dependencies
pnpm install

# Build and configure
pnpm build
node dist/cli.js install
```

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