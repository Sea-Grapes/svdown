// Based on https://github.com/sveltejs/svelte/blob/main/packages/svelte/src/compiler/phases/1-parse/utils/bracket.js
// Probably has 500 errors

// Finds the closing bracket of a svelte logic tag
export function findBracket(str: string, pos: number) {
  return findBracketCore(str, pos, true)
}

// Finds the closing bracket of a js expression
export function findBracketCore(
  str: string,
  pos: number,
  first = false
): number {
  if (str[pos] !== '{') {
    return -1
  }

  let i = pos + 1

  if (first) {
    const next = str[i]
    if (next === '#' || next === ':' || next === '/' || next === '@') {
      i++
    }
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
      const closingBrace = findBracketCore(str, i + 1, false)
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

interface JsBracket {
  start: number
  end: number
  text: string
}

interface SvelteElementData {
  start: number
  end: number
  text: string
  isClosing: boolean
  isSelfClosing: boolean
  jsBrackets: JsBracket[]
}

export function parseSvelteElement(
  string: string,
  pos: number
): SvelteElementData | null {
  if (string[pos] !== '<') return null

  let i = pos + 1
  const jsBrackets: JsBracket[] = []

  while (i < string.length) {
    const char = string[i]

    if (char === '"' || char === "'") {
      const quote = char
      i++

      while (i < string.length) {
        const char = string[i]
        if (char === quote) break

        if (char === '\\') {
          i += 2
          continue
        }

        if (char === '{') {
          const start = i
          const end = findBracketCore(string, i, false)

          if (end !== -1) {
            jsBrackets.push({ start, end, text: string.slice(start, end + 1) })
            i = end + 1
          } else i++
          continue
        }
      }
    }

    if (char === '{') {
      const start = i
      const end = findBracketCore(string, i, false)

      if (end !== -1) {
        jsBrackets.push({ start, end, text: string.slice(start, end + 1) })
        i = end + 1
      } else i++
      continue
    }

    if (char === '>') {
      const start = pos
      const end = i

      const text = string.slice(start, end + 1)
      const isClosing = text.startsWith('</')
      const isSelfClosing = text.endsWith('/>')

      return {
        start,
        end,
        text,
        isClosing,
        isSelfClosing,
        jsBrackets,
      }
    }

    i++
  }

  return null
}

function findHtmlStringEnd(
  str: string,
  pos: number = 0,
  quote: string
): number {
  let i = pos + 1

  while (i < str.length) {
    const char = str[i]

    if (char === quote) {
      return i
    }

    if (char === '\\') {
      i += 2
      continue
    }

    if (char === '{') {
      const closingBrace = findBracketCore(str, i, false)
      if (closingBrace === -1) return -1
      i = closingBrace + 1
      continue
    }

    i++
  }

  return -1
}
