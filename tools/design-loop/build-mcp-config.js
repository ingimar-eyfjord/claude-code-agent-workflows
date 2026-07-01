// build-mcp-config.js
function buildMcpConfig(platform, pins) {
  if (!pins || !pins.playwright || !pins.chromeDevtools) {
    throw new Error('Missing version pin(s): both playwright and chromeDevtools required')
  }
  const pwArgs = ['-y', `@playwright/mcp@${pins.playwright}`, '--config', '.claude/playwright-mcp.config.json']
  const cdArgs = ['-y', `chrome-devtools-mcp@${pins.chromeDevtools}`]
  const wrap = (args) => platform === 'win32'
    ? { command: 'cmd', args: ['/c', 'npx', ...args] }
    : { command: 'npx', args }
  return {
    mcpServers: {
      playwright: { type: 'stdio', ...wrap(pwArgs), env: {} },
      'chrome-devtools': { type: 'stdio', ...wrap(cdArgs), env: {} },
    },
  }
}
module.exports = { buildMcpConfig }
