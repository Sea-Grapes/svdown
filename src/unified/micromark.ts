// This file contains the micromark extension that supports svelte syntax.
// Docs: https://github.com/micromark/micromark?tab=readme-ov-file#creating-a-micromark-extension

import { Code, State, Tokenizer } from 'micromark-util-types'

const ch = (str: string) => str.charCodeAt(0)

const parseJs: Tokenizer = function (effects, ok, nok, depth = 1) {
  return inside

  function inside(code: Code) {
    if (code === null) return nok(code)

    if (code === ch('{')) {
      depth++
      effects.consume(code)
      return inside
    }

    if (code === ch('}')) {
      depth--
      effects.consume(code)
      if (depth === 0) {
        return ok
      }
      return inside
    }

    if (code === ch(`"`) || code === ch(`'`) || code === ch('`')) {
      effects.consume(code)
      return inString(code)
    }

    if (code === ch('/')) {
      return afterSlash
    }

    effects.consume(code)
    return inside
  }

  function inString(quote: Code) {
    // a second function required so we can store the quote character,
    // and thus match the correct one
    return function currentString(code: Code): State | undefined {
      if (code === null) return nok(code)
      effects.consume(code)

      if (code === quote) return inside

      if (code === '\\'.charCodeAt(0)) {
        return escapeCode(currentString)
      }

      if (quote === '`'.charCodeAt(0) && code === '$'.charCodeAt(0)) {
        return inStringTemplate
      }

      return currentString
    }
  }

  function inStringTemplate(code: Code) {
    if (code === '{'.charCodeAt(0)) {
      effects.consume(code)
      depth++
      return inside
    }

    // Todo: evaluate correctness (possible undef?)
    // continue with same string type
    return inString(ch('`'))(code)
  }

  function afterSlash(code: Code) {
    if (code === ch('/')) {
      effects.consume(code)
      return inLineComment
    }

    if (code === ch('*')) {
      effects.consume(code)
      return inBlockComment
    }

    return inRegex(code)
  }

  function inLineComment(code: Code) {
    if (code === null) return nok(code)
    effects.consume(code)
    if (code === ch('\n')) return inside
    return inLineComment
  }

  function inBlockComment(code: Code) {
    if (code === null) return nok(code)
    effects.consume(code)
    if (code === ch('*')) return afterBlockCommentStar
    return inBlockComment
  }

  function afterBlockCommentStar(code: Code) {
    // only break out of comment if exactly "*/"
    if (code === '/'.charCodeAt(0)) {
      effects.consume(code)
      return inside
    }
    return inBlockComment(code)
  }

  function inRegex(code: Code) {
    if (code === null) return nok(code)
    effects.consume(code)

    if (code === '/'.charCodeAt(0)) return inside

    if (code === '\\'.charCodeAt(0)) {
      return escapeCode(inRegex)
    }

    return inRegex
  }

  function escapeCode(next: (code: Code) => any) {
    return function escaped(code: Code) {
      if (code === null) return nok(code)
      effects.consume(code)
      return next
    }
  }
}
