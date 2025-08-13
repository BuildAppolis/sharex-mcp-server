#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import prompts from "prompts";
import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";
import * as os from "os";
import { exec, spawn } from "child_process";
import { promisify } from "util";
import { detectShareX, getShareXInfo } from "./utils/sharex.js";
import { updateClaudeConfig } from "./utils/config.js";
import { getClaudeConfigPath, ensureDirectory, convertWindowsPathToWSL } from "./utils/paths.js";

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if running as a pkg binary
const isPkgBinary = (process as any).pkg !== undefined;

const program = new Command();

program
  .name("sharex-mcp")
  .description("ShareX MCP Server - View screenshots and GIFs in Claude Code")
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
      
      // Step 2: Build the project (only if not running as binary)
      if (!isPkgBinary) {
        spinner.start("Building project...");
        await execAsync("pnpm build");
        spinner.succeed("Project built");
      }
      
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
        const serverPath = isPkgBinary
          ? process.execPath + " start"
          : os.platform() === "win32" 
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

// Add start command for running the server
program
  .command("start")
  .description("Start the ShareX MCP server")
  .action(async () => {
    const serverPath = isPkgBinary
      ? path.join(path.dirname(process.execPath), "index.js")
      : path.join(__dirname, "index.js");
    
    const child = spawn("node", [serverPath], {
      stdio: "inherit",
      env: process.env
    });

    child.on("error", (err) => {
      console.error(chalk.red("Failed to start server:"), err);
      process.exit(1);
    });

    child.on("exit", (code) => {
      process.exit(code ?? 0);
    });
  });

// Add register command for Claude Code integration
program
  .command("register")
  .description("Register the MCP server with Claude Code")
  .option("--scope <scope>", "Installation scope (user or project)", "user")
  .action(async (options) => {
    const spinner = ora();
    
    try {
      spinner.start("Registering with Claude Code...");
      
      const serverCommand = isPkgBinary
        ? `"${process.execPath}" start`
        : `node "${path.join(__dirname, "index.js")}"`;

      // Remove existing registration
      try {
        await execAsync("claude mcp remove sharex 2>/dev/null || true");
      } catch {
        // Ignore errors
      }

      // Add new registration
      await execAsync(`claude mcp add sharex --scope ${options.scope} -- ${serverCommand}`);
      
      spinner.succeed("Registered with Claude Code");
      
      console.log();
      console.log(chalk.green("✅ Registration complete!"));
      console.log();
      console.log(chalk.cyan("Next steps:"));
      console.log("1. Restart Claude Code");
      console.log("2. Take a screenshot");
      console.log('3. Tell Claude: "look at my latest screenshot"');
      
    } catch (error: any) {
      spinner.fail("Registration failed");
      console.error(chalk.red(error.message));
      console.error();
      console.error("You can manually register with:");
      
      const serverCommand = isPkgBinary
        ? `claude mcp add sharex --scope user -- "${process.execPath}" start`
        : `claude mcp add sharex --scope user -- node "${path.join(__dirname, "index.js")}"`;
      
      console.error(chalk.yellow(serverCommand));
      process.exit(1);
    }
  });

// Add unregister command
program
  .command("unregister")
  .description("Unregister the MCP server from Claude Code")
  .action(async () => {
    const spinner = ora();
    
    try {
      spinner.start("Unregistering from Claude Code...");
      await execAsync("claude mcp remove sharex");
      spinner.succeed("Unregistered from Claude Code");
    } catch (error: any) {
      spinner.fail("Failed to unregister");
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Add status command
program
  .command("status")
  .description("Check if the MCP server is registered")
  .action(async () => {
    try {
      const { stdout } = await execAsync("claude mcp list");
      
      if (stdout.includes("sharex")) {
        console.log(chalk.green("✅ ShareX MCP server is registered"));
        console.log();
        console.log("Server details:");
        const lines = stdout.split("\n");
        lines.forEach(line => {
          if (line.includes("sharex")) {
            console.log(line);
          }
        });
      } else {
        console.log(chalk.yellow("⚠️  ShareX MCP server is not registered"));
        console.log('Run "sharex-mcp register" to register it');
      }
    } catch (error: any) {
      console.error(chalk.red("Failed to check status:"), error.message);
      process.exit(1);
    }
  });

program.parse();