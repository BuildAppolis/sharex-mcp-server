import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";
import mime from "mime-types";
import chokidar, { FSWatcher } from "chokidar";
import { ServerConfig, defaultConfig } from "./config.js";
import { getShareXScreenshotPath } from "./utils/sharex.js";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ScreenshotMetadata {
  name: string;
  path: string;
  size: number;
  mtime: Date;
  type: string;
}

class ShareXMCPServer {
  private server: Server;
  private imageCache: Map<string, ScreenshotMetadata> = new Map();
  private gifCache: Map<string, ScreenshotMetadata> = new Map();
  private watcher: FSWatcher | null = null;
  private config: ServerConfig;
  private screenshotsDir: string | null = null;

  constructor(config: Partial<ServerConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    
    this.server = new Server(
      {
        name: "sharex-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
    this.initializeWatcher();
  }

  private async initializeWatcher() {
    try {
      // Determine screenshots directory
      if (this.config.shareXPath) {
        this.screenshotsDir = this.config.shareXPath;
      } else if (this.config.autoDetectShareX) {
        this.screenshotsDir = await getShareXScreenshotPath();
      }
      
      if (!this.screenshotsDir) {
        console.error("Could not determine ShareX screenshots directory");
        return;
      }
      
      console.error(`Watching ShareX directory: ${this.screenshotsDir}`);
      
      this.watcher = chokidar.watch(this.screenshotsDir, {
        ignored: /(^|[\/\\])\../,
        persistent: true,
        awaitWriteFinish: {
          stabilityThreshold: 1000,
          pollInterval: 100
        }
      });

      this.watcher
        .on("add", (filePath) => this.handleFileAdd(filePath))
        .on("change", (filePath) => this.handleFileAdd(filePath))
        .on("unlink", (filePath) => this.handleFileRemove(filePath));

      await this.scanDirectory();
    } catch (error) {
      console.error("Failed to initialize watcher:", error);
    }
  }

  private async handleFileAdd(filePath: string) {
    try {
      const stats = await fs.stat(filePath);
      const name = path.basename(filePath);
      const type = mime.lookup(filePath) || "unknown";
      
      const metadata: ScreenshotMetadata = {
        name,
        path: filePath,
        size: stats.size,
        mtime: stats.mtime,
        type
      };
      
      // Add to appropriate cache based on type
      if (type === "image/gif") {
        this.gifCache.set(name, metadata);
        this.enforceGifLimit();
      } else if (type.startsWith("image/")) {
        this.imageCache.set(name, metadata);
        this.enforceImageLimit();
      }
    } catch (error) {
      console.error(`Failed to process file ${filePath}:`, error);
    }
  }

  private handleFileRemove(filePath: string) {
    const name = path.basename(filePath);
    this.imageCache.delete(name);
    this.gifCache.delete(name);
  }
  
  private enforceImageLimit() {
    if (this.imageCache.size <= this.config.maxImages) return;
    
    // Sort by modification time and remove oldest
    const sorted = Array.from(this.imageCache.entries())
      .sort(([, a], [, b]) => a.mtime.getTime() - b.mtime.getTime());
    
    const toRemove = sorted.slice(0, this.imageCache.size - this.config.maxImages);
    for (const [name] of toRemove) {
      this.imageCache.delete(name);
    }
  }
  
  private enforceGifLimit() {
    if (this.gifCache.size <= this.config.maxGifs) return;
    
    // Sort by modification time and remove oldest
    const sorted = Array.from(this.gifCache.entries())
      .sort(([, a], [, b]) => a.mtime.getTime() - b.mtime.getTime());
    
    const toRemove = sorted.slice(0, this.gifCache.size - this.config.maxGifs);
    for (const [name] of toRemove) {
      this.gifCache.delete(name);
    }
  }

  private async scanDirectory() {
    try {
      if (!this.screenshotsDir) return;
      
      const files = await fs.readdir(this.screenshotsDir);
      
      // Process all files and collect metadata
      const allFiles: ScreenshotMetadata[] = [];
      
      for (const file of files) {
        const filePath = path.join(this.screenshotsDir, file);
        try {
          const stats = await fs.stat(filePath);
          const type = mime.lookup(filePath) || "unknown";
          
          if (type.startsWith("image/")) {
            allFiles.push({
              name: file,
              path: filePath,
              size: stats.size,
              mtime: stats.mtime,
              type
            });
          }
        } catch (error) {
          // Skip files we can't read
        }
      }
      
      // Sort by modification time (newest first)
      allFiles.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
      
      // Add to caches respecting limits
      for (const file of allFiles) {
        if (file.type === "image/gif" && this.gifCache.size < this.config.maxGifs) {
          this.gifCache.set(file.name, file);
        } else if (file.type !== "image/gif" && this.imageCache.size < this.config.maxImages) {
          this.imageCache.set(file.name, file);
        }
      }
    } catch (error) {
      console.error("Failed to scan directory:", error);
    }
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "check_latest_screenshots",
          description: "Get the most recent screenshots (up to 5)",
          inputSchema: {
            type: "object",
            properties: {
              count: {
                type: "number",
                description: "Number of screenshots to retrieve (max 5)",
                default: 1,
                minimum: 1,
                maximum: 5
              }
            }
          }
        },
        {
          name: "check_latest_gif",
          description: "Get the most recent GIF file",
          inputSchema: {
            type: "object",
            properties: {}
          }
        },
        {
          name: "get_screenshot_by_name",
          description: "Retrieve a specific screenshot by filename",
          inputSchema: {
            type: "object",
            properties: {
              filename: {
                type: "string",
                description: "The filename of the screenshot to retrieve"
              }
            },
            required: ["filename"]
          }
        },
        {
          name: "list_screenshots",
          description: "List all available screenshots with metadata",
          inputSchema: {
            type: "object",
            properties: {
              limit: {
                type: "number",
                description: "Maximum number of screenshots to list",
                default: 20
              }
            }
          }
        },
        {
          name: "extract_gif_frames",
          description: "Extract frames from a GIF file. Use this when a GIF is too large or when you need to analyze individual frames.",
          inputSchema: {
            type: "object",
            properties: {
              filename: {
                type: "string",
                description: "The filename of the GIF to extract frames from (optional, uses latest if not specified)"
              },
              maxFrames: {
                type: "number",
                description: "Maximum number of frames to extract (default: 10)",
                default: 10,
                minimum: 1,
                maximum: 30
              },
              frameInterval: {
                type: "number",
                description: "Extract every Nth frame (default: 1 for every frame)",
                default: 1,
                minimum: 1
              }
            }
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case "check_latest_screenshots":
          return await this.getLatestScreenshots((args as any)?.count || 1);
        
        case "check_latest_gif":
          return await this.getLatestGif();
        
        case "get_screenshot_by_name":
          return await this.getScreenshotByName((args as any)?.filename || "");
        
        case "list_screenshots":
          return await this.listScreenshots((args as any)?.limit || 20);
        
        case "extract_gif_frames":
          return await this.extractGifFrames(
            (args as any)?.filename,
            (args as any)?.maxFrames || 10,
            (args as any)?.frameInterval || 1
          );
        
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  private async getLatestScreenshots(count: number) {
    const imageFiles = Array.from(this.imageCache.values())
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
      .slice(0, count);

    if (imageFiles.length === 0) {
      return {
        content: [{
          type: "text",
          text: "No screenshots found. Take a screenshot with ShareX and try again."
        }]
      };
    }

    const content = [];
    
    for (const file of imageFiles) {
      try {
        const imageData = await fs.readFile(file.path);
        const base64 = imageData.toString("base64");
        
        content.push({
          type: "text",
          text: `Screenshot: ${file.name} (${new Date(file.mtime).toLocaleString()})`
        });
        
        content.push({
          type: "image",
          data: base64,
          mimeType: file.type
        });
      } catch (error) {
        content.push({
          type: "text",
          text: `Failed to read ${file.name}: ${error}`
        });
      }
    }

    return { content };
  }

  private async getLatestGif() {
    const gifFiles = Array.from(this.gifCache.values())
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    if (gifFiles.length === 0) {
      return {
        content: [{
          type: "text",
          text: "No GIF files found. Record a GIF with ShareX and try again."
        }]
      };
    }

    const latestGif = gifFiles[0];
    
    try {
      // Check file size first
      const stats = await fs.stat(latestGif.path);
      const maxSize = 10 * 1024 * 1024; // 10MB limit for GIFs
      
      if (stats.size > maxSize) {
        return {
          content: [{
            type: "text",
            text: `Latest GIF: ${latestGif.name} (${new Date(latestGif.mtime).toLocaleString()})\nFile size: ${(stats.size / 1024 / 1024).toFixed(2)}MB\n\nNote: GIF is too large to display directly (>10MB).\n\nUse the 'extract_gif_frames' tool to break down this GIF into individual frames for viewing.\n\nFile location: ${latestGif.path}`
          }]
        };
      }
      
      const gifData = await fs.readFile(latestGif.path);
      const base64 = gifData.toString("base64");
      
      return {
        content: [
          {
            type: "text",
            text: `Latest GIF: ${latestGif.name} (${new Date(latestGif.mtime).toLocaleString()}) - ${(stats.size / 1024).toFixed(2)}KB`
          },
          {
            type: "image",
            data: base64,
            mimeType: "image/gif"
          }
        ]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Failed to read GIF: ${error}`
        }]
      };
    }
  }

  private async getScreenshotByName(filename: string) {
    const file = this.imageCache.get(filename) || this.gifCache.get(filename);
    
    if (!file) {
      return {
        content: [{
          type: "text",
          text: `Screenshot "${filename}" not found. Use list_screenshots to see available files.`
        }]
      };
    }

    try {
      // Check file size first
      const stats = await fs.stat(file.path);
      const maxSize = file.type === "image/gif" ? 10 * 1024 * 1024 : 50 * 1024 * 1024; // 10MB for GIFs, 50MB for images
      
      if (stats.size > maxSize) {
        const sizeLimit = file.type === "image/gif" ? "10MB" : "50MB";
        return {
          content: [{
            type: "text",
            text: `File: ${file.name} (${new Date(file.mtime).toLocaleString()})\nFile size: ${(stats.size / 1024 / 1024).toFixed(2)}MB\n\nNote: File is too large to display directly (>${sizeLimit}). File location: ${file.path}`
          }]
        };
      }
      
      const imageData = await fs.readFile(file.path);
      const base64 = imageData.toString("base64");
      
      return {
        content: [
          {
            type: "text",
            text: `${file.type === "image/gif" ? "GIF" : "Screenshot"}: ${file.name} (${new Date(file.mtime).toLocaleString()}) - ${(stats.size / 1024).toFixed(2)}KB`
          },
          {
            type: "image",
            data: base64,
            mimeType: file.type
          }
        ]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Failed to read file: ${error}`
        }]
      };
    }
  }

  private async listScreenshots(limit: number) {
    const allFiles = [
      ...Array.from(this.imageCache.values()),
      ...Array.from(this.gifCache.values())
    ]
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
      .slice(0, limit);

    if (allFiles.length === 0) {
      return {
        content: [{
          type: "text",
          text: "No files cached. Take a screenshot with ShareX to start tracking."
        }]
      };
    }

    const fileList = allFiles.map(file => 
      `- ${file.name} (${file.type}, ${(file.size / 1024).toFixed(2)} KB, ${new Date(file.mtime).toLocaleString()})`
    ).join("\n");
    
    const stats = `Images: ${this.imageCache.size}/${this.config.maxImages}, GIFs: ${this.gifCache.size}/${this.config.maxGifs}`;

    return {
      content: [{
        type: "text",
        text: `Available screenshots (${allFiles.length} files, ${stats}):\n${fileList}`
      }]
    };
  }

  private async extractGifFrames(filename?: string, maxFrames: number = 10, frameInterval: number = 1) {
    let targetGif: ScreenshotMetadata | undefined;
    
    // Get the GIF file to process
    if (filename) {
      targetGif = this.gifCache.get(filename);
      if (!targetGif) {
        return {
          content: [{
            type: "text",
            text: `GIF file "${filename}" not found. Use list_screenshots to see available GIF files.`
          }]
        };
      }
    } else {
      // Get the latest GIF
      const gifFiles = Array.from(this.gifCache.values())
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
      
      if (gifFiles.length === 0) {
        return {
          content: [{
            type: "text",
            text: "No GIF files found. Record a GIF with ShareX and try again."
          }]
        };
      }
      
      targetGif = gifFiles[0];
    }
    
    try {
      // Notify user that extraction is starting
      const startMessage = `Extracting frames from GIF: ${targetGif.name}\nFile size: ${(targetGif.size / 1024).toFixed(2)} KB\nProcessing...`;
      
      // Load the GIF with sharp
      const gif = sharp(targetGif.path, { animated: true });
      const metadata = await gif.metadata();
      
      if (!metadata.pages) {
        return {
          content: [{
            type: "text",
            text: `GIF file ${targetGif.name} appears to be a static image (no animation frames found).`
          }]
        };
      }
      
      const totalFrames = metadata.pages;
      const framesToExtract = Math.min(Math.ceil(totalFrames / frameInterval), maxFrames);
      
      const content: any[] = [{
        type: "text",
        text: `${startMessage}\n\nGIF Details:\n- Total frames: ${totalFrames}\n- Extracting: ${framesToExtract} frames (every ${frameInterval === 1 ? '' : frameInterval + 'th '}frame)\n- Dimensions: ${metadata.width}x${metadata.height}\n\nExtracted frames:`
      }];
      
      // Extract frames
      for (let i = 0; i < framesToExtract; i++) {
        const frameIndex = i * frameInterval;
        if (frameIndex >= totalFrames) break;
        
        try {
          // Extract specific frame
          const frameBuffer = await sharp(targetGif.path, { 
            animated: true,
            page: frameIndex 
          })
            .png()
            .toBuffer();
          
          const base64 = frameBuffer.toString("base64");
          
          content.push({
            type: "text",
            text: `Frame ${frameIndex + 1}/${totalFrames}:`
          });
          
          content.push({
            type: "image",
            data: base64,
            mimeType: "image/png"
          });
        } catch (frameError) {
          content.push({
            type: "text",
            text: `Failed to extract frame ${frameIndex + 1}: ${frameError}`
          });
        }
      }
      
      return { content };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Failed to extract frames from GIF: ${error}\n\nNote: The GIF file might be corrupted or in an unsupported format.`
        }]
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("ShareX MCP Server running on stdio");
  }
}

// Load config from environment or use defaults
const config: Partial<ServerConfig> = {
  maxImages: parseInt(process.env.SHAREX_MAX_IMAGES || "10"),
  maxGifs: parseInt(process.env.SHAREX_MAX_GIFS || "5"),
  shareXPath: process.env.SHAREX_PATH,
  autoDetectShareX: process.env.SHAREX_AUTO_DETECT !== "false"
};

const server = new ShareXMCPServer(config);
server.run().catch(console.error);