// Temporary mitigation for validator.js isURL advisory (GHSA-9965-vmph-33xx)
// Replaces validator.isURL with a safer runtime check using WHATWG URL parsing
// until an upstream patch is available. This file should be required early during app startup.

try {
  // try to require validator package
  const validator = require('validator');

  // store original if needed
  if (!validator.__original_isURL) validator.__original_isURL = validator.isURL;

  // safer isURL fallback: try to parse with WHATWG URL and check protocol and host
  const safeIsURL = (str, options) => {
    if (typeof str !== 'string') return false;
    try {
      // Allow data: and mailto: if explicitly requested via options?
      const url = new URL(str);
      // basic guard: must have protocol and hostname or pathname (for file:// and data URIs)
      if (!url.protocol) return false;
      // Accept http(s) and most other schemes but require hostname for http/https
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        return !!url.hostname && url.hostname.length > 0;
      }
      // For other protocols (mailto:, file:, data:), fall back to original if available
      if (validator.__original_isURL) {
        // call original implementation as a fallback
        return validator.__original_isURL(str, options);
      }
      // as a last resort, accept the URL if URL constructor parsed it
      return true;
    } catch (err) {
      return false;
    }
  };

  // replace only if the function exists
  if (validator && typeof validator.isURL === 'function') {
    validator.isURL = safeIsURL;
    // also patch the default export if present
    if (validator.default && typeof validator.default.isURL === 'function') {
      validator.default.isURL = safeIsURL;
    }
  // patched validator.isURL with safer fallback; no verbose log here
  }
} catch (err) {
  // if validator isn't installed, nothing to do
  // eslint-disable-next-line no-console
  console.warn('validator mitigation: validator package not present or failed to patch', err && err.message);
}

module.exports = {};
