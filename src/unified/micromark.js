// This file contains the micromark extension that supports svelte syntax.
// Docs: https://github.com/micromark/micromark?tab=readme-ov-file#creating-a-micromark-extension
// Logic from https://github.com/sveltejs/svelte/blob/main/packages/svelte/src/compiler/phases/1-parse/utils/bracket.js

const ch = (str) => str.charCodeAt(0)

function parseJs(effects, ok, nok, depth = 1) {
  return inside

  function inside(code) {
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
      effects.consume(code)
      return afterSlash
    }

    effects.consume(code)
    return inside
  }

  function inString(quote) {
    return function currentString(code) {
      if (code === null) return nok(code)
      effects.consume(code)

      if (code === quote) return inside

      if (code === ch('\\')) {
        return escapeCode(currentString)
      }

      if (quote === ch('`') && code === ch('$')) {
        return inStringTemplate
      }

      return currentString
    }
  }

  function inStringTemplate(code) {
    if (code === ch('{')) {
      effects.consume(code)
      depth++
      return inside
    }

    // continue with same string type
    return inString(ch('`'))(code)
  }

  function afterSlash(code) {
    if (code === null) return nok(code)

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

  function inLineComment(code) {
    if (code === null) return nok(code)
    effects.consume(code)
    if (code === ch('\n')) return inside
    return inLineComment
  }

  function inBlockComment(code) {
    if (code === null) return nok(code)
    effects.consume(code)
    if (code === ch('*')) return afterBlockCommentStar
    return inBlockComment
  }

  function afterBlockCommentStar(code) {
    // only break out of comment if exactly "*/"
    if (code === ch('/')) {
      effects.consume(code)
      return inside
    }
    return inBlockComment(code)
  }

  function inRegex(code) {
    if (code === null) return nok(code)
    effects.consume(code)

    if (code === ch('/')) return inside

    if (code === ch('\\')) {
      return escapeCode(inRegex)
    }

    return inRegex
  }

  // consumes escape character "\" and its next character
  function escapeCode(next) {
    return function escaped(code) {
      if (code === null) return nok(code)
      effects.consume(code)
      return next
    }
  }
}

// handles svelte logic (like {#if}, {:else}, etc.)
export function svelteLogic(effects, ok, nok) {
  return start

  function start(code) {
    if (code !== ch('{')) return nok
    effects.enter('svelteLogic')
    effects.consume(code)
    return afterBrace
  }

  function afterBrace(code) {
    if (code === ch('#') || code === ch(':') || code === '/' || code === '@') {
      effects.consume(code)
      return parseJs(effects, end, nok)
    }
    return nok(code)
  }

  function end() {
    // Todo: fix this with stack
    effects.exit('svelteLogic')
    return ok
  }
}

// handles inline expressions (like {count > 5})
export function svelteExpression(effects, ok, nok) {
  return start

  function start() {
    if (code !== ch('{')) return nok(code)
    effects.enter('svelteExpression')
  }
}
