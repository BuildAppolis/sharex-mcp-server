import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
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

interface ExtractedFrames {
  gifName: string;
  frames: string[]; // Base64 encoded frames
  totalFrames: number;
  extractedAt: Date;
}

class ShareXMCPServer {
  private server: Server;
  private imageCache: Map<string, ScreenshotMetadata> = new Map();
  private gifCache: Map<string, ScreenshotMetadata> = new Map();
  private extractedFramesCache: Map<string, ExtractedFrames> = new Map();
  private watcher: FSWatcher | null = null;
  private config: ServerConfig;
  private screenshotsDir: string | null = null;
  private tempDir: string;

  constructor(config: Partial<ServerConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.tempDir = this.config.tempFramesPath || path.join(os.tmpdir(), 'sharex-mcp-frames');
    
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
    this.ensureTempDir();
  }

  private async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error("Failed to create temp directory:", error);
    }
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
        // Clear extracted frames for this GIF if it was updated
        this.extractedFramesCache.delete(name);
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
    this.extractedFramesCache.delete(name);
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
      this.extractedFramesCache.delete(name);
    }
  }

  private async scanDirectory() {
    if (!this.screenshotsDir) return;
    
    try {
      const files = await fs.readdir(this.screenshotsDir);
      
      for (const file of files) {
        const filePath = path.join(this.screenshotsDir, file);
        await this.handleFileAdd(filePath);
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
          description: "Get the most recent screenshot(s)",
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
          description: "Get the most recent GIF (automatically extracts frames if needed)",
          inputSchema: {
            type: "object",
            properties: {}
          }
        },
        {
          name: "check_gif_by_index",
          description: "Get a specific GIF by its index (1-5, where 1 is the most recent)",
          inputSchema: {
            type: "object",
            properties: {
              index: {
                type: "number",
                description: "Index of the GIF (1=newest, 2=second newest, etc.)",
                minimum: 1,
                maximum: 5
              }
            },
            required: ["index"]
          }
        },
        {
          name: "list_gifs",
          description: "List available GIFs with their index numbers",
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
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case "check_latest_screenshots":
          return await this.getLatestScreenshots((args as any)?.count || 1);
        
        case "check_latest_gif":
          return await this.getGifWithFrames();
        
        case "check_gif_by_index":
          return await this.getGifWithFrames((args as any)?.index);
        
        case "list_gifs":
          return await this.listGifs();
        
        case "get_screenshot_by_name":
          return await this.getScreenshotByName((args as any)?.filename || "");
        
        case "list_screenshots":
          return await this.listScreenshots((args as any)?.limit || 20);
        
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
          text: `Failed to read screenshot ${file.name}: ${error}`
        });
      }
    }

    return { content };
  }

  private async listGifs() {
    const gifFiles = Array.from(this.gifCache.values())
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
      .slice(0, 5);

    if (gifFiles.length === 0) {
      return {
        content: [{
          type: "text",
          text: "No GIF files found. Record a GIF with ShareX and try again."
        }]
      };
    }

    const gifList = gifFiles.map((file, index) => 
      `${index + 1}. ${file.name} - ${(file.size / 1024).toFixed(2)} KB - ${new Date(file.mtime).toLocaleString()}`
    ).join("\n");

    return {
      content: [{
        type: "text",
        text: `Available GIFs (use check_gif_by_index with the number):\n${gifList}\n\nUse index 1 for the latest GIF, or specify 2-${gifFiles.length} for older ones.`
      }]
    };
  }

  private async getGifWithFrames(index?: number) {
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

    const gifIndex = (index || 1) - 1;
    if (gifIndex < 0 || gifIndex >= gifFiles.length) {
      return {
        content: [{
          type: "text",
          text: `Invalid GIF index. Please use 1-${gifFiles.length}. Use list_gifs to see available GIFs.`
        }]
      };
    }

    const targetGif = gifFiles[gifIndex];
    
    // Check if we already have extracted frames cached
    if (this.extractedFramesCache.has(targetGif.name)) {
      const cached = this.extractedFramesCache.get(targetGif.name)!;
      return this.formatExtractedFrames(cached, targetGif);
    }

    // Extract frames
    try {
      const content = [{
        type: "text",
        text: `Processing GIF: ${targetGif.name} (${(targetGif.size / 1024).toFixed(2)} KB)\nExtracting frames...`
      }];

      // Check if GIF is too large
      const maxSize = 50 * 1024 * 1024; // 50MB absolute max
      if (targetGif.size > maxSize) {
        return {
          content: [{
            type: "text",
            text: `GIF file ${targetGif.name} is too large (${(targetGif.size / 1024 / 1024).toFixed(2)} MB). Maximum supported size is 50MB.`
          }]
        };
      }

      // Load and extract frames
      const gif = sharp(targetGif.path, { animated: true });
      const metadata = await gif.metadata();
      
      if (!metadata.pages || metadata.pages <= 1) {
        // Static image or single frame, just return it
        const gifData = await fs.readFile(targetGif.path);
        const base64 = gifData.toString("base64");
        
        return {
          content: [
            {
              type: "text",
              text: `GIF: ${targetGif.name} (static/single frame)`
            },
            {
              type: "image",
              data: base64,
              mimeType: "image/gif"
            }
          ]
        };
      }

      const totalFrames = metadata.pages;
      const framesToExtract = Math.min(totalFrames, this.config.maxFramesPerGif);
      const frameInterval = Math.max(1, Math.floor(totalFrames / framesToExtract));
      
      const frames: string[] = [];
      
      for (let i = 0; i < framesToExtract; i++) {
        const frameIndex = Math.min(i * frameInterval, totalFrames - 1);
        
        try {
          const frameBuffer = await sharp(targetGif.path, { 
            animated: true,
            page: frameIndex 
          })
            .png()
            .toBuffer();
          
          frames.push(frameBuffer.toString("base64"));
        } catch (frameError) {
          console.error(`Failed to extract frame ${frameIndex}:`, frameError);
        }
      }

      // Cache the extracted frames
      const extracted: ExtractedFrames = {
        gifName: targetGif.name,
        frames,
        totalFrames,
        extractedAt: new Date()
      };
      
      this.extractedFramesCache.set(targetGif.name, extracted);
      
      return this.formatExtractedFrames(extracted, targetGif);
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Failed to process GIF: ${error}\n\nThe GIF file might be corrupted or in an unsupported format.`
        }]
      };
    }
  }

  private formatExtractedFrames(extracted: ExtractedFrames, gif: ScreenshotMetadata) {
    const content: any[] = [{
      type: "text",
      text: `GIF: ${gif.name}\n` +
            `Size: ${(gif.size / 1024).toFixed(2)} KB\n` +
            `Total frames: ${extracted.totalFrames}\n` +
            `Showing: ${extracted.frames.length} frames${extracted.frames.length < extracted.totalFrames ? ` (every ${Math.floor(extracted.totalFrames / extracted.frames.length)} frames)` : ''}`
    }];

    // Add each frame
    extracted.frames.forEach((frame, index) => {
      const actualFrameNumber = Math.floor(index * (extracted.totalFrames / extracted.frames.length)) + 1;
      content.push({
        type: "text",
        text: `Frame ${actualFrameNumber}/${extracted.totalFrames}:`
      });
      content.push({
        type: "image",
        data: frame,
        mimeType: "image/png"
      });
    });

    return { content };
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

    // If it's a GIF, use the frame extraction logic
    if (file.type === "image/gif") {
      const gifFiles = Array.from(this.gifCache.values())
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
      const index = gifFiles.findIndex(g => g.name === filename) + 1;
      return await this.getGifWithFrames(index);
    }

    try {
      const imageData = await fs.readFile(file.path);
      const base64 = imageData.toString("base64");
      
      return {
        content: [
          {
            type: "text",
            text: `Screenshot: ${file.name} (${new Date(file.mtime).toLocaleString()})`
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

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("ShareX MCP Server running on stdio");
  }
}

const server = new ShareXMCPServer();
server.run().catch(console.error);