# Publishing to NPM

## ⚠️ Security First

**NEVER** share your NPM access token publicly! If you've accidentally exposed a token:
1. Immediately go to https://www.npmjs.com/settings/~/tokens
2. Delete the exposed token
3. Generate a new one

## Setup

### 1. Login to NPM with your organization
```bash
npm login --scope=@buildappolis
# Enter your username, password, and email
# Or use: npm login --auth-type=legacy
```

### 2. Verify your login
```bash
npm whoami
# Should show your username

npm org ls @buildappolis
# Should show organization members
```

## Publishing Process

### 1. Ensure everything is built
```bash
# Clean build
rm -rf dist/
pnpm build
```

### 2. Test locally
```bash
# Pack the package to see what will be published
npm pack --dry-run

# Check the package size and contents
npm pack
tar -tzf buildappolis-sharex-mcp-server-*.tgz
rm *.tgz
```

### 3. Update version (if needed)
```bash
# Patch version (1.0.0 -> 1.0.1)
npm version patch

# Minor version (1.0.0 -> 1.1.0)
npm version minor

# Major version (1.0.0 -> 2.0.0)
npm version major
```

### 4. Publish to NPM
```bash
# Publish with public access (required for scoped packages)
npm publish --access public

# Or if you want to test first:
npm publish --dry-run --access public
```

## After Publishing

### Update installation instructions
Update the README to use the NPM package:

```markdown
# Install globally
npm install -g @buildappolis/sharex-mcp-server

# Or with pnpm
pnpm add -g @buildappolis/sharex-mcp-server
```

### Tag the release on GitHub
```bash
git tag v1.0.0
git push origin v1.0.0
```

### Create GitHub Release
1. Go to https://github.com/buildappolis/sharex-mcp-server/releases
2. Click "Create a new release"
3. Choose the tag you just created
4. Add release notes

## Automated Publishing (GitHub Actions)

Create `.github/workflows/publish.yml`:

```yaml
name: Publish to NPM

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm run build
      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{secrets.NPM_TOKEN}}
```

Then add your NPM token as a GitHub secret:
1. Go to Settings → Secrets → Actions
2. Add `NPM_TOKEN` with your token value

## Package Installation Methods

Once published, users can install via:

### Global install (recommended)
```bash
npm install -g @buildappolis/sharex-mcp-server
sharex-mcp init
```

### Or use directly with npx
```bash
npx @buildappolis/sharex-mcp-server init
```

### For Claude Code MCP registration
```bash
claude mcp add sharex -- npx -y @buildappolis/sharex-mcp-server
```

## Troubleshooting

### 402 Payment Required
- Ensure you're using `--access public` for scoped packages
- Verify you're logged in to the correct organization

### 403 Forbidden
- Check you have publish rights to the @buildappolis org
- Ensure the package name matches your org scope

### Package not found after publishing
- It can take a few minutes to appear on NPM
- Check: https://www.npmjs.com/package/@buildappolis/sharex-mcp-server

## Security Best Practices

1. **Use NPM 2FA**: Enable two-factor authentication on your NPM account
2. **Use Tokens**: Create automation tokens for CI/CD, not your personal token
3. **Rotate Tokens**: Regularly rotate your NPM tokens
4. **Minimal Permissions**: Use tokens with minimal required permissions
5. **Never Commit Tokens**: Use environment variables or GitHub secrets

---

Remember: Keep your NPM tokens secure and never share them in code, chat, or documentation!