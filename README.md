# ShareX MCP Server

[![npm version](https://img.shields.io/npm/v/@buildappolis/sharex-mcp-server.svg)](https://www.npmjs.com/package/@buildappolis/sharex-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

A Model Context Protocol (MCP) server that seamlessly integrates ShareX screenshots and GIFs with Claude Code, enabling AI-powered analysis of your visual content.

Built by [BuildAppolis](https://www.buildappolis.com) - *Building the future, one app at a time.*

## Features

### 📸 Screenshot Management
- **Instant Access**: View your latest screenshots directly in Claude Code
- **Multi-Screenshot Support**: Retrieve up to 5 recent screenshots at once
- **Smart Caching**: Tracks your 10 most recent screenshots automatically
- **File Metadata**: See file sizes, timestamps, and types at a glance

### 🎬 Advanced GIF Handling
- **Automatic Frame Extraction**: GIFs are automatically broken down into individual frames
- **Indexed Selection**: Access GIFs by number (1-5) for easy reference
- **Smart Frame Sampling**: Intelligently selects frames from long GIFs
- **Large File Support**: Handles GIFs up to 50MB with graceful degradation
- **Frame Caching**: Extracted frames are cached for instant access

### 🔄 Real-Time Monitoring
- **Live Updates**: Automatically detects new screenshots as you take them
- **File Watching**: Monitors your ShareX screenshot directory in real-time
- **Auto-Cleanup**: Maintains optimal performance by managing cache limits

## Quick Start

### Prerequisites
- Windows 10/11 or WSL
- [ShareX](https://getsharex.com/) installed and configured
- [Claude Code](https://claude.ai/download) installed
- Node.js 18+ (for installation)

### Installation

#### Option 1: Install from NPM (Recommended)
```bash
# Install globally
npm install -g @buildappolis/sharex-mcp-server

# Register with Claude Code
claude mcp add sharex -- npx -y @buildappolis/sharex-mcp-server
```

#### Option 2: Quick Install Scripts

**Windows (PowerShell)**
```powershell
# One-line installer
iwr -useb https://raw.githubusercontent.com/hellocory/sharex-mcp-server/main/setup.ps1 | iex
```

**WSL/Linux**
```bash
# One-line installer
curl -fsSL https://raw.githubusercontent.com/hellocory/sharex-mcp-server/main/install.sh | bash
```

The installers will automatically:
1. Install the MCP server
2. Register it with Claude Code
3. Configure everything for immediate use

### Verify Installation
```bash
# Check if the server is registered
claude mcp list

# You should see:
# sharex: ✓ Connected
```

## Usage

### Basic Commands

Once installed, just ask Claude:

- **"Look at my latest screenshot"** - Shows your most recent screenshot
- **"Check my latest GIF"** - Automatically extracts and displays frames from your latest GIF
- **"Show me the last 3 screenshots"** - Displays multiple recent screenshots
- **"List my GIFs"** - Shows numbered list of available GIFs
- **"Show GIF number 2"** - Displays the second most recent GIF

### Taking Screenshots with ShareX

1. Press your ShareX hotkey (default: `PrtScn`)
2. Capture your screen area
3. Ask Claude to view it immediately - no file navigation needed!

### Recording GIFs with ShareX

1. Press your ShareX GIF hotkey (default: `Shift+PrtScn`)
2. Record your screen
3. Stop recording
4. Ask Claude to view the GIF - frames are extracted automatically!

## Features in Action

### Smart GIF Processing
When you ask to see a GIF, the server:
- Detects the GIF format automatically
- Extracts up to 10 representative frames
- Shows frame numbers and metadata
- Caches the extraction for instant replay

### Indexed Access
```
User: "List my GIFs"
Claude: Available GIFs:
1. screen_recording.gif - 2.3 MB - 2 mins ago
2. demo_animation.gif - 1.1 MB - 10 mins ago
3. bug_report.gif - 4.5 MB - 1 hour ago

User: "Show number 3"
Claude: [Displays frames from bug_report.gif]
```

## Configuration

The MCP server uses ShareX's default screenshot location automatically. If you've customized your ShareX settings, the server will detect and use your custom path.

### Default Limits
- **Screenshots**: Tracks 10 most recent
- **GIFs**: Tracks 5 most recent
- **Frames per GIF**: Extracts up to 10 frames
- **Max GIF size**: 50MB

## Troubleshooting

### Server Not Connected

If using NPM package:
```bash
# Re-register the server
claude mcp remove sharex
claude mcp add sharex -- npx -y @buildappolis/sharex-mcp-server
```

If using local installation:
```bash
# Re-register the server
claude mcp remove sharex
claude mcp add sharex --scope user -- cmd /c node "C:\Users\%USERNAME%\sharex-mcp-server\dist\index.js"
```

### Can't See Screenshots
1. Ensure ShareX is saving to Documents\ShareX\Screenshots
2. Take a new screenshot to trigger detection
3. Check server status: `claude mcp list`

### GIF Issues
- GIFs over 50MB will show metadata only
- Corrupted GIFs will display an error message
- Try recording a shorter GIF if extraction fails

## Uninstall

### NPM Package
```bash
# Remove from Claude Code
claude mcp remove sharex

# Uninstall package
npm uninstall -g @buildappolis/sharex-mcp-server
```

### Local Installation

**Windows**
```powershell
claude mcp remove sharex
Remove-Item -Recurse -Force "$env:USERPROFILE\sharex-mcp-server"
```

**WSL**
```bash
claude mcp remove sharex
rm -rf ~/sharex-mcp-server
```

## Contributing

Want to help improve ShareX MCP Server? Check out our [Contributing Guide](CONTRIBUTING.md) for development setup and guidelines.

## Support

- **Issues**: [GitHub Issues](https://github.com/hellocory/sharex-mcp-server/issues)
- **Updates**: [GitHub Releases](https://github.com/hellocory/sharex-mcp-server/releases)
- **Developer**: [BuildAppolis](https://www.buildappolis.com)

## License

MIT License - See [LICENSE](LICENSE) file for details.

---

*ShareX MCP Server is a [BuildAppolis](https://www.buildappolis.com) project, crafted with care to enhance your AI-assisted workflow.*