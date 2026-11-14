// Mintlify keeps apostrophes in heading anchors, rendered curly
// (`## Who's affected` -> `#who’s-affected`), so links that slug the heading by
// hand break. Headings are worded without apostrophes instead.

const APOSTROPHE = /['’]/
const HEADING = /^#{1,6}\s+(.*)$/
const FENCE = /^\s*(`{3,}|~{3,})/

module.exports = {
  names: ['heading-no-apostrophes'],
  description: 'Headings have no apostrophes, which Mintlify keeps in anchors',
  tags: ['headings', 'mintlify'],
  parser: 'none',
  function: (params, onError) => {
    const allowed = params.config.allowed ?? []
    let fence = null
    params.lines.forEach((line, index) => {
      const fenceMatch = line.match(FENCE)
      if (fenceMatch) {
        const marker = fenceMatch[1]
        if (fence === null) fence = marker
        else if (marker[0] === fence[0] && marker.length >= fence.length) fence = null
        return
      }
      if (fence !== null) return
      const heading = line.match(HEADING)
      if (!heading) return
      const text = allowed.reduce((t, phrase) => t.split(phrase).join(''), heading[1])
      if (APOSTROPHE.test(text)) {
        onError({
          lineNumber: index + 1,
          detail: "Reword without the apostrophe (can't → cannot, What's → What is)",
          context: line.trim()
        })
      }
    })
  }
}
