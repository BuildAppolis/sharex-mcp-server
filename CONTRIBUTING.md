# Contributing to ShareX MCP Server

Thank you for your interest in contributing to ShareX MCP Server! This guide will help you set up your development environment and understand our contribution process.

## Development Setup

### Prerequisites

- Node.js 18+ and pnpm
- Windows 10/11 (for ShareX)
- ShareX installed
- Git
- TypeScript knowledge

### Local Development

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/sharex-mcp-server.git
   cd sharex-mcp-server
   ```

2. **Install Dependencies**
   ```bash
   pnpm install
   ```

3. **Development Mode**
   ```bash
   # Run with hot reload
   pnpm dev
   
   # Or build and test
   pnpm build
   pnpm start
   ```

4. **Register for Testing**
   ```bash
   # Register your local development version
   claude mcp add sharex-dev --scope local -- node "$(pwd)/dist/index.js"
   ```

## Self-Hosting Guide

If you want to run your own modified version:

### Building from Source

```bash
# Clone the repository
git clone https://github.com/buildappolis/sharex-mcp-server.git
cd sharex-mcp-server

# Install dependencies
pnpm install

# Build the project
pnpm build

# The built server is now in dist/
```

### Manual Configuration

#### Windows Configuration

Create or update `%USERPROFILE%\.claude.json`:
```json
{
  "mcpServers": {
    "sharex": {
      "command": "node",
      "args": ["C:\\path\\to\\your\\sharex-mcp-server\\dist\\index.js"],
      "env": {
        "SHAREX_MAX_IMAGES": "10",
        "SHAREX_MAX_GIFS": "5"
      }
    }
  }
}
```

#### WSL Configuration

Create or update `~/.claude.json`:
```json
{
  "mcpServers": {
    "sharex": {
      "command": "node",
      "args": ["/mnt/c/path/to/your/sharex-mcp-server/dist/index.js"],
      "env": {
        "SHAREX_MAX_IMAGES": "10",
        "SHAREX_MAX_GIFS": "5"
      }
    }
  }
}
```

### Environment Variables

Configure the server behavior:

```bash
# Maximum number of recent images to track (default: 10)
SHAREX_MAX_IMAGES=10

# Maximum number of recent GIFs to track (default: 5)
SHAREX_MAX_GIFS=5

# Maximum frames to extract per GIF (default: 10)
SHAREX_MAX_FRAMES_PER_GIF=10

# Custom ShareX screenshots path (auto-detected by default)
SHAREX_PATH="C:/Users/YourName/Documents/ShareX/Screenshots"

# Disable auto-detection of ShareX path
SHAREX_AUTO_DETECT=false

# Custom temp directory for frame extraction
SHAREX_TEMP_PATH="C:/temp/sharex-frames"
```

## Project Structure

```
sharex-mcp-server/
├── src/
│   ├── index.ts          # Main server implementation
│   ├── config.ts         # Configuration management
│   └── utils/
│       ├── sharex.ts     # ShareX integration utilities
│       └── paths.ts      # Path handling for cross-platform
├── dist/                 # Built JavaScript files
├── install.sh           # WSL installer script
├── setup.ps1            # Windows installer script
└── package.json         # Project metadata
```

## Architecture Overview

### Core Components

1. **MCP Server** (`src/index.ts`)
   - Implements the Model Context Protocol
   - Manages screenshot and GIF caches
   - Handles frame extraction from GIFs
   - Provides tools for Claude Code

2. **File Watcher**
   - Monitors ShareX screenshot directory
   - Real-time detection of new files
   - Automatic cache management

3. **GIF Processor**
   - Uses Sharp library for frame extraction
   - Intelligent frame sampling
   - Caching of extracted frames

4. **Cross-Platform Support**
   - Path translation between Windows and WSL
   - Automatic ShareX directory detection
   - Platform-specific installers

### MCP Tools

The server provides these tools to Claude Code:

- `check_latest_screenshots` - Get recent screenshots
- `check_latest_gif` - Get latest GIF with auto frame extraction
- `check_gif_by_index` - Get specific GIF by number
- `list_gifs` - List available GIFs with indexes
- `get_screenshot_by_name` - Get specific file by name
- `list_screenshots` - List all available files

## Testing

### Manual Testing

1. Take screenshots with ShareX
2. Use Claude Code to request them
3. Record GIFs and verify frame extraction
4. Test with large files (>10MB GIFs)

### Test Commands

```bash
# Check if server is running
claude mcp list

# Test screenshot retrieval
# In Claude Code:
"show my latest screenshot"
"list my gifs"
"show gif number 2"
```

## Code Style

- TypeScript with strict mode
- ESLint configuration (if added)
- Clear comments for complex logic
- Meaningful variable names
- Async/await over callbacks

## Submitting Changes

### Pull Request Process

1. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**
   - Write clear, concise code
   - Add comments for complex logic
   - Update documentation if needed

3. **Test Thoroughly**
   - Test with real ShareX screenshots
   - Verify GIF frame extraction
   - Check both Windows and WSL if possible

4. **Commit with Clear Messages**
   ```bash
   git commit -m "feat: Add support for WebP images"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

### Commit Message Format

We follow conventional commits:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `refactor:` Code refactoring
- `test:` Test additions/changes
- `chore:` Maintenance tasks

## Feature Ideas

Looking for something to work on? Here are some ideas:

- [ ] Support for other screenshot tools
- [ ] Video file support (MP4 extraction)
- [ ] OCR text extraction from images
- [ ] Thumbnail generation for previews
- [ ] Web UI for configuration
- [ ] Multiple ShareX profile support
- [ ] Cloud storage integration
- [ ] Image annotation tools

## Getting Help

- **Discord**: [BuildAppolis Community](https://www.buildappolis.com)
- **Issues**: [GitHub Issues](https://github.com/buildappolis/sharex-mcp-server/issues)
- **Email**: support@buildappolis.com

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

*Thank you for contributing to ShareX MCP Server! Together, we're building better AI-assisted workflows.*