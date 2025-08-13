import * as fs from "fs/promises";
import * as path from "path";

interface ClaudeConfig {
  mcpServers?: Record<string, any>;
}

export async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function writeJsonFile(filePath: string, data: any): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

export async function updateClaudeConfig(
  configPath: string,
  serverPath: string
): Promise<void> {
  const config = await readJsonFile<ClaudeConfig>(configPath) || {};
  
  if (!config.mcpServers) {
    config.mcpServers = {};
  }
  
  config.mcpServers.sharex = {
    command: "node",
    args: [serverPath],
    env: {}
  };
  
  await writeJsonFile(configPath, config);
}