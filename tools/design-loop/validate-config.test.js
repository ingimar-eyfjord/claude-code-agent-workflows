// validate-config.test.js
const { test } = require('node:test')
const assert = require('node:assert')
const { validateDesignLoopConfig } = require('./validate-config.js')

const GOOD = {
  baseUrl: 'http://localhost:8000',
  authMode: 'storage-state',
  sessionMintCmd: 'docker compose exec -T django python manage.py shell < scripts/mint_review_session.py',
  pencilDesignFile: '/x/AllocationSurface.pen',
  viewports: ['1440x900', '375x812'],
  routes: [{ path: '/admin/', label: 'Admin', waitFor: 'body' }],
}

test('accepts a well-formed config', () => {
  const r = validateDesignLoopConfig(GOOD)
  assert.strictEqual(r.valid, true)
  assert.deepStrictEqual(r.errors, [])
})

test('rejects missing baseUrl', () => {
  const r = validateDesignLoopConfig({ ...GOOD, baseUrl: undefined })
  assert.strictEqual(r.valid, false)
  assert.ok(r.errors.some(e => /baseUrl/.test(e)))
})

test('rejects non-http baseUrl', () => {
  const r = validateDesignLoopConfig({ ...GOOD, baseUrl: 'ftp://x' })
  assert.ok(r.errors.some(e => /baseUrl.*http/.test(e)))
})

test('rejects empty routes', () => {
  const r = validateDesignLoopConfig({ ...GOOD, routes: [] })
  assert.ok(r.errors.some(e => /routes/.test(e)))
})

test('rejects malformed viewport', () => {
  const r = validateDesignLoopConfig({ ...GOOD, viewports: ['big'] })
  assert.ok(r.errors.some(e => /viewport/.test(e)))
})

test('rejects unknown authMode', () => {
  const r = validateDesignLoopConfig({ ...GOOD, authMode: 'magic' })
  assert.ok(r.errors.some(e => /authMode/.test(e)))
})
