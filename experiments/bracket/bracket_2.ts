export function findMatchingBrace(
  template: string,
  start: number,
  requireSvelteMarker = false
): number {
  if (template[start] !== '{') {
    return -1
  }

  let i = start + 1

  // Check for Svelte block marker if required
  if (requireSvelteMarker) {
    const nextChar = template[i]
    if (
      nextChar !== '#' &&
      nextChar !== ':' &&
      nextChar !== '/' &&
      nextChar !== '@'
    ) {
      return -1
    }
    i++ // Skip the marker
  }

  let depth = 1

  while (i < template.length && depth > 0) {
    const char = template[i]

    switch (char) {
      case '"':
      case "'":
      case '`':
        i = findStringEnd(template, i, char)
        if (i === -1) return -1
        i++
        continue

      case '/': {
        const next = template[i + 1]

        switch (next) {
          case '/': // Line comment
            i = template.indexOf('\n', i + 2)
            if (i === -1) return -1
            i++
            continue

          case '*': // Block comment
            i = template.indexOf('*/', i + 2)
            if (i === -1) return -1
            i += 2
            continue

          default: // Regex
            i = findRegexEnd(template, i)
            if (i === -1) return -1
            i++
            continue
        }
      }

      case '{':
        depth++
        i++
        continue

      case '}':
        depth--
        if (depth === 0) {
          return i
        }
        i++
        continue

      default:
        i++
    }
  }

  return -1 // Not found
}

/**
 * Finds the matching closing brace for a Svelte block.
 * Convenience wrapper that requires a Svelte marker.
 */
export function findSvelteBlockEnd(template: string, start: number): number {
  return findMatchingBrace(template, start, true)
}

/**
 * Finds the end of a string, handling escape sequences.
 *
 * @param template The string to search
 * @param start The index after the opening quote
 * @param quote The quote character (', ", or `)
 * @returns The index of the closing quote, or -1 if not found
 */
function findStringEnd(template: string, start: number, quote: string): number {
  let i = start + 1

  while (i < template.length) {
    const char = template[i]

    // Found closing quote
    if (char === quote) {
      return i
    }

    // Handle escape sequences
    if (char === '\\') {
      i += 2 // Skip escaped character
      continue
    }

    // Handle template literal expressions
    if (quote === '`' && char === '$' && template[i + 1] === '{') {
      const closingBrace = findMatchingBrace(template, i + 1)
      if (closingBrace === -1) return -1
      i = closingBrace + 1
      continue
    }

    // For single/double quotes, stop at newline
    if (quote !== '`' && char === '\n') {
      return -1
    }

    i++
  }

  return -1 // Not found
}

/**
 * Finds the end of a regex expression.
 *
 * @param template The string to search
 * @param start The index of the opening /
 * @returns The index of the closing /, or -1 if not found
 */
function findRegexEnd(template: string, start: number): number {
  let i = start + 1

  while (i < template.length) {
    const char = template[i]

    // Found closing slash
    if (char === '/') {
      return i
    }

    // Handle escape sequences
    if (char === '\\') {
      i += 2 // Skip escaped character
      continue
    }

    i++
  }

  return -1 // Not found
}

/**
 * Counts consecutive leading backslashes before the given index.
 * Used to determine if a character is escaped.
 */
function countLeadingBackslashes(str: string, index: number): number {
  let count = 0
  let i = index
  while (i >= 0 && str[i] === '\\') {
    count++
    i--
  }
  return count
}
