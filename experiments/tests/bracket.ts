export function findSvelteBlockEnd(str: string, start: number): number {
  if (str[start] !== '{') {
    return -1
  }

  const nextChar = str[start + 1]
  if (
    nextChar !== '#' &&
    nextChar !== ':' &&
    nextChar !== '/' &&
    nextChar !== '@'
  ) {
    return -1
  }

  let depth = 1
  let i = start + 2 // Skip opening brace and marker

  while (i < str.length && depth > 0) {
    const char = str[i]

    // Handle strings
    if (char === '"' || char === "'" || char === '`') {
      i = findStringEnd(str, i, char)
      if (i === -1) return -1
      i++
      continue
    }

    // Handle comments and regex
    if (char === '/') {
      const next = str[i + 1]

      // Line comment
      if (next === '/') {
        i = str.indexOf('\n', i + 2)
        if (i === -1) return -1
        i++
        continue
      }

      // Block comment
      if (next === '*') {
        i = str.indexOf('*/', i + 2)
        if (i === -1) return -1
        i += 2
        continue
      }

      // Regex
      i = findRegexEnd(str, i)
      if (i === -1) return -1
      i++
      continue
    }

    // Handle nested braces
    if (char === '{') {
      depth++
    } else if (char === '}') {
      depth--
      if (depth === 0) {
        return i
      }
    }

    i++
  }

  return -1 // Not found
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
 * Finds the matching closing brace for regular nested braces (non-Svelte blocks).
 *
 * @param str The string to search
 * @param start The index of the opening brace
 * @returns The index of the closing brace, or -1 if not found
 */
function findMatchingBrace(str: string, start: number): number {
  if (str[start] !== '{') {
    return -1
  }

  let depth = 1
  let i = start + 1

  while (i < str.length && depth > 0) {
    const char = str[i]

    // Handle strings
    if (char === '"' || char === "'" || char === '`') {
      i = findStringEnd(str, i, char)
      if (i === -1) return -1
      i++
      continue
    }

    // Handle comments and regex
    if (char === '/') {
      const next = str[i + 1]

      if (next === '/') {
        i = str.indexOf('\n', i + 2)
        if (i === -1) return -1
        i++
        continue
      }

      if (next === '*') {
        i = str.indexOf('*/', i + 2)
        if (i === -1) return -1
        i += 2
        continue
      }

      i = findRegexEnd(str, i)
      if (i === -1) return -1
      i++
      continue
    }

    // Handle nested braces
    if (char === '{') {
      depth++
    } else if (char === '}') {
      depth--
      if (depth === 0) {
        return i
      }
    }

    i++
  }

  return -1
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
