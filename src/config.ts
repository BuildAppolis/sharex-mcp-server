export interface ServerConfig {
  // Path to ShareX screenshots folder (read-only)
  shareXPath?: string;
  
  // Maximum number of recent images to track
  maxImages: number;
  
  // Maximum number of recent GIFs to track
  maxGifs: number;
  
  // Whether to automatically detect ShareX path
  autoDetectShareX: boolean;
  
  // Maximum frames to extract from GIFs
  maxFramesPerGif: number;
  
  // Path to temp folder for extracted frames
  tempFramesPath?: string;
}

export const defaultConfig: ServerConfig = {
  maxImages: 10,
  maxGifs: 5,
  autoDetectShareX: true,
  maxFramesPerGif: 10,
  tempFramesPath: undefined // Will use system temp if not specified
};