export interface ServerConfig {
  // Path to ShareX screenshots folder (read-only)
  shareXPath?: string;
  
  // Maximum number of recent images to track
  maxImages: number;
  
  // Maximum number of recent GIFs to track
  maxGifs: number;
  
  // Whether to automatically detect ShareX path
  autoDetectShareX: boolean;
}

export const defaultConfig: ServerConfig = {
  maxImages: 10,
  maxGifs: 5,
  autoDetectShareX: true
};