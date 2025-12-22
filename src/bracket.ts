// Based on https://github.com/sveltejs/svelte/blob/main/packages/svelte/src/compiler/phases/1-parse/utils/bracket.js
// Probably has 500 errors

// Todo: eval if need 2 types: svelteLogic and js/json
// probably not necessary
export function findBracket(str: string, pos: number, svelte = true): number {
  if (str[pos] !== '{') {
    return -1
  }

  let i = pos + 1

  if (svelte) {
    const next = str[i]
    if (next !== '#' && next !== ':' && next !== '/' && next !== '@') {
      return -1
    }
    i++
  }

  let depth = 1

  while (i < str.length && depth > 0) {
    const char = str[i]

    switch (char) {
      case '"':
      case "'":
      case '`':
        i = findStringEnd(str, i, char)
        if (i === -1) return -1
        i++
        continue

      case '/': {
        const next = str[i + 1]

        switch (next) {
          case '/': // Line comment
            i = str.indexOf('\n', i + 2)
            if (i === -1) return -1
            i++
            continue

          case '*': // Block comment
            i = str.indexOf('*/', i + 2)
            if (i === -1) return -1
            i += 2
            continue

          default: // Regex
            i = findRegexEnd(str, i)
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
 * Finds the end of a string, handling escape sequences.
 *
 * @param str The string to search
 * @param pos The index after the opening quote
 * @param quote The quote character (', ", or `)
 * @returns The index of the closing quote, or -1 if not found
 */
function findStringEnd(str: string, pos: number, quote: string): number {
  let i = pos + 1

  while (i < str.length) {
    const char = str[i]

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
    if (quote === '`' && char === '$' && str[i + 1] === '{') {
      const closingBrace = findBracket(str, i + 1, false)
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
 * @param str The string to search
 * @param pos The index of the opening /
 * @returns The index of the closing /, or -1 if not found
 */
function findRegexEnd(str: string, pos: number): number {
  let i = pos + 1

  while (i < str.length) {
    const char = str[i]

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
