#!/usr/bin/env node
import { execSync } from "child_process";
import * as path from "path";
import * as fs from "fs/promises";
import chalk from "chalk";
import ora from "ora";
import prompts from "prompts";

async function init() {
  console.log(chalk.blue("🚀 ShareX MCP Server Quick Setup"));
  console.log();

  const spinner = ora();

  try {
    // Ask for installation directory
    const response = await prompts({
      type: "text",
      name: "installPath",
      message: "Where would you like to install ShareX MCP Server?",
      initial: path.join(process.env.HOME || process.env.USERPROFILE || ".", "sharex-mcp-server")
    });

    if (!response.installPath) {
      console.log(chalk.red("Installation cancelled"));
      return;
    }

    const installPath = path.resolve(response.installPath);

    // Create directory
    spinner.start("Creating directory...");
    await fs.mkdir(installPath, { recursive: true });
    spinner.succeed();

    // Clone repository
    spinner.start("Downloading ShareX MCP Server...");
    try {
      execSync(`git clone https://github.com/yourusername/sharex-mcp-server.git "${installPath}"`, { stdio: "ignore" });
    } catch {
      // Fallback to npm pack
      execSync(`npm pack sharex-mcp-server`, { cwd: installPath, stdio: "ignore" });
      execSync(`tar -xf sharex-mcp-server-*.tgz --strip-components=1`, { cwd: installPath, stdio: "ignore" });
      await fs.unlink(path.join(installPath, "sharex-mcp-server-*.tgz"));
    }
    spinner.succeed();

    // Install and setup
    spinner.start("Installing dependencies...");
    execSync("pnpm install", { cwd: installPath, stdio: "ignore" });
    spinner.succeed();

    spinner.start("Building project...");
    execSync("pnpm build", { cwd: installPath, stdio: "ignore" });
    spinner.succeed();

    spinner.start("Running setup...");
    execSync("node dist/cli.js install", { cwd: installPath, stdio: "inherit" });
    spinner.succeed();

    console.log();
    console.log(chalk.green("✅ Setup complete!"));
    console.log();
    console.log(chalk.cyan("ShareX MCP Server is ready to use."));
    
  } catch (error) {
    spinner.fail();
    console.error(chalk.red("Setup failed:"), error);
    process.exit(1);
  }
}

init().catch(console.error);