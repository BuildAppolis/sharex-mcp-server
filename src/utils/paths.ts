import * as os from "os";
import * as path from "path";
import * as fs from "fs/promises";

export function getShareXConfigPath(): string {
  const platform = os.platform();
  
  if (platform === "win32") {
    const documentsPath = path.join(os.homedir(), "Documents", "ShareX");
    return documentsPath;
  }
  
  throw new Error("ShareX is only supported on Windows");
}

export function getClaudeConfigPath(): string {
  const platform = os.platform();
  
  if (platform === "win32") {
    return path.join(os.homedir(), ".claude", "settings.json");
  } else {
    return path.join(os.homedir(), ".claude", "settings.json");
  }
}

export async function ensureDirectory(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export function convertWindowsPathToWSL(windowsPath: string): string {
  // Convert D:\path\to\file to /mnt/d/path/to/file
  const normalized = windowsPath.replace(/\\/g, "/");
  const match = normalized.match(/^([A-Za-z]):(.*)/);
  
  if (match) {
    const drive = match[1].toLowerCase();
    const path = match[2];
    return `/mnt/${drive}${path}`;
  }
  
  return normalized;
}