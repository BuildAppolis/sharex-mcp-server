import * as fs from "fs/promises";
import * as path from "path";
import { getShareXConfigPath } from "./paths.js";

interface ShareXConfig {
  CustomScreenshotsPath?: string;
  UseCustomScreenshotsPath?: boolean;
}

export async function detectShareX(): Promise<boolean> {
  try {
    const configPath = getShareXConfigPath();
    const stats = await fs.stat(configPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

export async function getShareXScreenshotPath(): Promise<string | null> {
  try {
    const configDir = getShareXConfigPath();
    const settingsPath = path.join(configDir, "ApplicationConfig.json");
    
    const content = await fs.readFile(settingsPath, "utf-8");
    const config: ShareXConfig = JSON.parse(content);
    
    if (config.UseCustomScreenshotsPath && config.CustomScreenshotsPath) {
      return config.CustomScreenshotsPath;
    }
    
    return path.join(configDir, "Screenshots");
  } catch {
    return null;
  }
}

export async function getShareXInfo(): Promise<{ path: string | null; isDefault: boolean }> {
  const screenshotPath = await getShareXScreenshotPath();
  const configDir = getShareXConfigPath();
  const defaultPath = path.join(configDir, "Screenshots");
  
  return {
    path: screenshotPath,
    isDefault: screenshotPath === defaultPath
  };
}