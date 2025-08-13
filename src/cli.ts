#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import prompts from "prompts";
import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";
import * as os from "os";
import { exec } from "child_process";
import { promisify } from "util";
import { detectShareX, getShareXInfo } from "./utils/sharex.js";
import { updateClaudeConfig } from "./utils/config.js";
import { getClaudeConfigPath, ensureDirectory, convertWindowsPathToWSL } from "./utils/paths.js";

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();

program
  .name("sharex-mcp")
  .description("ShareX MCP Server installer and configuration tool")
  .version("1.0.0");

program
  .command("install")
  .description("Install and configure ShareX MCP Server")
  .option("-p, --path <path>", "Custom installation path")
  .option("-s, --skip-sharex", "Skip ShareX configuration")
  .option("-c, --skip-claude", "Skip Claude Code configuration")
  .action(async (options) => {
    console.log(chalk.blue("🚀 ShareX MCP Server Installer"));
    console.log();

    const spinner = ora();
    
    try {
      // Step 1: Determine installation path
      const installPath = options.path || process.cwd();
      
      // Step 2: Build the project
      spinner.start("Building project...");
      await execAsync("pnpm build");
      spinner.succeed("Project built");
      
      // Step 3: Check ShareX
      let shareXPath: string | null = null;
      
      if (!options.skipSharex) {
        spinner.start("Detecting ShareX...");
        const hasShareX = await detectShareX();
        
        if (hasShareX) {
          const shareXInfo = await getShareXInfo();
          shareXPath = shareXInfo.path;
          spinner.succeed(`ShareX detected: ${shareXPath}`);
          
          console.log();
          console.log(chalk.yellow("ℹ️  ShareX Configuration:"));
          console.log(`   Screenshots folder: ${shareXPath}`);
          console.log(`   The MCP server will read from this folder without modifying it.`);
          console.log();
        } else {
          spinner.warn("ShareX not found - you'll need to configure the path manually");
        }
      }
      
      // Step 4: Configure Claude Code
      if (!options.skipClaude) {
        spinner.start("Configuring Claude Code...");
        const claudeConfigPath = getClaudeConfigPath();
        const serverPath = os.platform() === "win32" 
          ? path.join(installPath, "dist", "index.js")
          : convertWindowsPathToWSL(path.join(installPath, "dist", "index.js"));
        
        await updateClaudeConfig(claudeConfigPath, serverPath);
        spinner.succeed("Claude Code configured");
      }
      
      console.log();
      console.log(chalk.green("✅ Installation complete!"));
      console.log();
      console.log(chalk.cyan("Next steps:"));
      console.log("1. Restart Claude Code to load the MCP server");
      console.log("2. Take a screenshot with ShareX");
      console.log('3. Tell Claude: "look at my latest screenshot"');
      
    } catch (error) {
      spinner.fail("Installation failed");
      console.error(chalk.red(error));
      process.exit(1);
    }
  });

program.parse();