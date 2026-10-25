// Only allow absolute https links, or root-relative paths to this site's own
// files (e.g. /Aakash-TCS-Resume.pdf), so a bad value from the API can never
// become a javascript:, data: or off-site protocol-relative URL in an href.
export function safeUrl(url) {
  if (typeof url !== 'string' || !url) return null
  try {
    if (/^\/(?![/\\])/.test(url)) {
      const u = new URL(url, window.location.origin)
      return u.origin === window.location.origin ? u.pathname : null
    }
    const u = new URL(url)
    return u.protocol === 'https:' ? u.href : null
  } catch {
    return null
  }
}

export const isSameSite = (href) => typeof href === 'string' && href.startsWith('/')
