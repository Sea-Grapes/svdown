const INLINE_CODE = '\uE000'.charCodeAt(0)
const BLOCK_CODE = '\uE001'.charCodeAt(0)

function svelte_extension() {
  return {
    flow: {
      [BLOCK_CODE]: { tokenize: tokenize_block },
    },
    text: {
      [INLINE_CODE]: { tokenize: tokenize_inline },
    },
  }
}

function svelte_from_markdown() {
  return {
    enter: {
      svelteInline(token) {
        this.enter({ type: 'svelteInline' }, token)
      },
      svelteBlock(token) {
        this.enter({ type: 'svelteBlock' }, token)
      },
    },
    exit: {
      svelteInline(token) {
        this.exit(token)
      },
      svelteBlock(token) {
        this.exit(token)
      },
    },
  }
}

function tokenize_inline(effects, ok) {
  return function (code) {
    effects.enter('svelteInline')
    effects.consume(code)
    effects.exit('svelteInline')
    return ok
  }
}

function tokenize_block(effects, ok) {
  return start

  function start(code) {
    effects.enter('svelteBlock')
    effects.consume(code)
    effects.exit('svelteBlock')
    return ok
  }
}

function remark_svelte_placeholders() {
  const data = this.data()

  ;(data.micromarkExtensions ??= []).push(svelte_extension())
  ;(data.fromMarkdownExtensions ??= []).push(svelte_from_markdown())
}
