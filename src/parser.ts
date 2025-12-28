import hastToString from 'rehype-stringify'
import toMdast from 'remark-parse'
import mdastToHast from 'remark-rehype'
import { unified } from 'unified'
import { PluginConfig } from '.'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { visit } from 'unist-util-visit'
import { findBracket, findBracketCore } from './bracket'
import { replaceStrSection } from './util'
import type { Root } from 'mdast'
import { astInspect } from './dev'
import { inspect } from 'unist-util-inspect'

export async function parse(
  content: string,
  { config, filename }: { config?: PluginConfig; filename?: string } = {}
): Promise<string> {
  const parser = new SvmdParser(config)
  let res = await parser.parse(content, filename)
  return res
}

export class SvmdParser {
  config: PluginConfig

  constructor(config?: PluginConfig) {
    // Todo: default config + merging
    this.config = config ?? {}
  }

  async parse(content: string, filename?: string): Promise<any> {
    console.log('start str:')
    console.log(content)

    // basic mdast parse
    let mdast = fromMarkdown(content)
    let text_ranges: Array<{ start: number; end: number }> = []
    console.log('\nmdast:')
    console.log(inspect(mdast, { color: true }))
    visit(mdast, 'text', (node) => {
      // fumb typescript
      if (
        node.position &&
        typeof node.position.start.offset == 'number' &&
        typeof node.position.end.offset == 'number'
      ) {
        text_ranges.push({
          start: node.position.start.offset,
          end: node.position.end.offset,
        })
      }
    })
    text_ranges.sort((a, b) => a.start - b.start)
    console.log('\ntext_ranges:')
    console.log(text_ranges)

    let bracket_pairs: Array<{ start: number; end: number; text: string }> = []

    for (const range of text_ranges) {
      let i = range.start
      // Todo: eval efficiency (can reuse bracket knowledge)
      while (i < range.end) {
        if (content[i] === '{') {
          const end = findBracket(content, i)
          console.log('found end:', end)
          if (end !== -1 && end < content.length) {
            // We found a bracket pair
            bracket_pairs.push({ start: i, end: end + 1, text: '' })
            i = end + 1
          } else i++
        } else i++
      }
    }
    console.log('\nbracket_pairs:')
    console.log(bracket_pairs)

    bracket_pairs.reverse().forEach((pair) => {
      pair.text = content.slice(pair.start, pair.end)
      content = content.slice(0, pair.start) + 'svmd0' + content.slice(pair.end)
    })

    function restoreBrackets() {
      return (tree: Root) => {
        visit(tree, 'text', (node) => {
          if (node.value.includes('svmd0')) {
            node.value = node.value.replaceAll('svmd0', () => {
              return bracket_pairs.pop()?.text || 'svmd0'
            })
          }
        })
      }
    }

    const parse = unified()
      .use(toMdast)
      .use(restoreBrackets)
      .use(astInspect())
      .use(mdastToHast, {
        allowDangerousHtml: true,
        allowDangerousCharacters: true,
      })
      .use(astInspect())
      .use(hastToString, {
        allowDangerousHtml: true,
        allowDangerousCharacters: true,
      })

    let res = String(parse.processSync(content))

    console.log('Final str:')
    console.log(res)

    return {
      code: res,
    }
  }
}
