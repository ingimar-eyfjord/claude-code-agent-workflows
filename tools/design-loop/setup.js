#!/usr/bin/env node
// Resolves + pins MCP versions, writes OS-correct .mcp.json and the Playwright MCP config
// into the CURRENT PROJECT's working directory. Run from the target repo root.
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const { buildMcpConfig } = require('./build-mcp-config.js')
const { validateDesignLoopConfig } = require('./validate-config.js')

function resolvePin(pkg) {
  const v = execSync(`npm view ${pkg} version`, { encoding: 'utf8' }).trim()
  if (!/^\d+\.\d+\.\d+/.test(v)) throw new Error(`Could not resolve version for ${pkg}: "${v}"`)
  return v
}

function main() {
  const cwd = process.cwd()
  const cfgPath = path.join(cwd, '.claude', 'design-loop.json')
  if (!fs.existsSync(cfgPath)) {
    console.error(`Missing ${cfgPath}. Create it first (see design-loop.schema.json).`)
    process.exit(1)
  }
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'))
  const { valid, errors } = validateDesignLoopConfig(cfg)
  if (!valid) { console.error('Invalid design-loop.json:\n- ' + errors.join('\n- ')); process.exit(1) }

  const pins = { playwright: resolvePin('@playwright/mcp'), chromeDevtools: resolvePin('chrome-devtools-mcp') }
  console.log(`Pinning @playwright/mcp@${pins.playwright}, chrome-devtools-mcp@${pins.chromeDevtools}`)

  fs.writeFileSync(path.join(cwd, '.mcp.json'), JSON.stringify(buildMcpConfig(process.platform, pins), null, 2) + '\n')

  const [w, h] = cfg.viewports[0].split('x')
  const origin = new URL(cfg.baseUrl).origin
  const allowed = JSON.stringify([origin, `${origin}:*`, 'http://localhost:*'])
  const tpl = fs.readFileSync(path.join(__dirname, 'playwright-mcp.config.template.json'), 'utf8')
    .replace('{{VIEWPORT_W}}', w).replace('{{VIEWPORT_H}}', h).replace('{{ALLOWED_ORIGINS}}', allowed)
  fs.mkdirSync(path.join(cwd, '.claude'), { recursive: true })
  fs.writeFileSync(path.join(cwd, '.claude', 'playwright-mcp.config.json'), tpl)

  // Install Chromium for Playwright (idempotent)
  try { execSync('npx -y playwright install chromium', { stdio: 'inherit' }) } catch (e) { console.warn('playwright install chromium failed; run manually.') }

  console.log('\nWrote .mcp.json + .claude/playwright-mcp.config.json.')
  console.log('Now enable the servers: run `/mcp` in Claude Code and approve `playwright` + `chrome-devtools`,')
  console.log('or add them to .claude/settings.local.json `enabledMcpjsonServers`.')
}
main()
