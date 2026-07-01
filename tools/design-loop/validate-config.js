// validate-config.js
const VIEWPORT_RE = /^\d{2,5}x\d{2,5}$/
const AUTH_MODES = ['storage-state', 'none']

function validateDesignLoopConfig(c) {
  const errors = []
  if (!c || typeof c !== 'object') return { valid: false, errors: ['config must be an object'] }
  if (typeof c.baseUrl !== 'string') errors.push('baseUrl is required (string)')
  else if (!/^https?:\/\//.test(c.baseUrl)) errors.push('baseUrl must start with http:// or https://')
  if (!AUTH_MODES.includes(c.authMode)) errors.push(`authMode must be one of: ${AUTH_MODES.join(', ')}`)
  if (c.authMode === 'storage-state' && typeof c.sessionMintCmd !== 'string')
    errors.push('sessionMintCmd is required (string) when authMode=storage-state')
  if (!Array.isArray(c.viewports) || c.viewports.length === 0) errors.push('viewports must be a non-empty array')
  else c.viewports.forEach(v => { if (!VIEWPORT_RE.test(v)) errors.push(`viewport "${v}" must look like 1440x900`) })
  if (!Array.isArray(c.routes) || c.routes.length === 0) errors.push('routes must be a non-empty array')
  else c.routes.forEach((r, i) => {
    if (!r || typeof r.path !== 'string' || !r.path.startsWith('/')) errors.push(`routes[${i}].path must be a string starting with /`)
  })
  return { valid: errors.length === 0, errors }
}
module.exports = { validateDesignLoopConfig }
