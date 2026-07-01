// build-mcp-config.test.js
const { test } = require('node:test')
const assert = require('node:assert')
const { buildMcpConfig } = require('./build-mcp-config.js')

const PINS = { playwright: '0.0.41', chromeDevtools: '0.6.0' }

test('darwin uses npx directly', () => {
  const cfg = buildMcpConfig('darwin', PINS)
  assert.strictEqual(cfg.mcpServers.playwright.command, 'npx')
  assert.deepStrictEqual(cfg.mcpServers.playwright.args,
    ['-y', '@playwright/mcp@0.0.41', '--config', '.claude/playwright-mcp.config.json'])
  assert.strictEqual(cfg.mcpServers['chrome-devtools'].command, 'npx')
  assert.deepStrictEqual(cfg.mcpServers['chrome-devtools'].args,
    ['-y', 'chrome-devtools-mcp@0.6.0'])
})

test('win32 wraps in cmd /c', () => {
  const cfg = buildMcpConfig('win32', PINS)
  assert.strictEqual(cfg.mcpServers.playwright.command, 'cmd')
  assert.deepStrictEqual(cfg.mcpServers.playwright.args,
    ['/c', 'npx', '-y', '@playwright/mcp@0.0.41', '--config', '.claude/playwright-mcp.config.json'])
  assert.strictEqual(cfg.mcpServers['chrome-devtools'].command, 'cmd')
  assert.deepStrictEqual(cfg.mcpServers['chrome-devtools'].args,
    ['/c', 'npx', '-y', 'chrome-devtools-mcp@0.6.0'])
})

test('never emits @latest', () => {
  const json = JSON.stringify(buildMcpConfig('darwin', PINS))
  assert.ok(!json.includes('@latest'))
})

test('throws on missing pins', () => {
  assert.throws(() => buildMcpConfig('darwin', { playwright: '0.0.41' }), /pin/i)
})
