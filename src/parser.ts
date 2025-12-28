import hastToString from 'rehype-stringify'
import toMdast from 'remark-parse'
import mdastToHast from 'remark-rehype'
import { unified } from 'unified'
import { PluginConfig } from '.'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { visit } from 'unist-util-visit'
import { findBracket, findBracketCore } from './bracket'
import { replaceStrSection } from './util'
import type { Node, Root } from 'mdast'
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
    console.log(mdast)
    // console.log(inspect(mdast, { color: true }))
    visit(mdast, ['text', 'html'], (node: Node) => {
      // fumb typescript
      // @ts-ignore
      let text: string = node.value

      // not needed but safe
      if (!text.includes('{')) return

      if (node.type === 'html') {
        let blacklist = ['script', 'style']
        let tag = text.match(/\w+/)?.[0] || ''
        if (blacklist.includes(tag)) return
      }

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

    interface Pair {
      start: number
      end: number
      text: string
      isSvelteLogic: boolean
    }

    let bracket_pairs: Pair[] = []

    for (const range of text_ranges) {
      let i = range.start
      // Todo: eval efficiency (can reuse bracket knowledge)
      while (i < range.end) {
        // console.log(content)
        // console.log(content[i])
        if (content[i] === '{') {
          const end = findBracket(content, i)
          // console.log('found end:', i, end)
          if (end !== -1 && end < content.length) {
            let tmp = end + 1
            const text = content.slice(i, tmp)
            const isSvelteLogic = /{[#:/@]\w+/.test(text)
            // We found a bracket pair
            bracket_pairs.push({ start: i, end: tmp, text, isSvelteLogic })
            i = tmp
          } else i++
        } else i++
      }
    }
    console.log('\nbracket_pairs:')
    console.log(bracket_pairs)

    const js_brackets: Pair[] = []
    const sv_brackets: Pair[] = []
    const at_brackets: Pair[] = []

    bracket_pairs.reverse().forEach((pair) => {
      if (pair.isSvelteLogic) {
        // Todo: eval smarter solution
        if (pair.text.startsWith('{@attach')) {
          content = replaceStrSection(content, pair.start, pair.end, 'svmd1')
          at_brackets.push(pair)
        } else {
          content = replaceStrSection(
            content,
            pair.start,
            pair.end,
            '<!--svmd:logic-->'
          )
          js_brackets.push(pair)
        }
      } else {
        content =
          content.slice(0, pair.start) + 'svmd0' + content.slice(pair.end)
        sv_brackets.push(pair)
      }
    })

    function restoreBrackets() {
      return (tree: Root) => {
        visit(tree, 'text', (node) => {
          if (node.value.includes('svmd0')) {
            node.value = node.value.replaceAll('svmd0', () => {
              return js_brackets.pop()?.text || 'svmd0'
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

    content = String(parse.processSync(content))

    content = content.replaceAll('<!--svmd:logic-->', () => {
      return sv_brackets.pop()?.text || '<!--svmd:logic-->'
    })

    content = content.replaceAll('svmd1', () => {
      return at_brackets.pop()?.text || 'svmd1'
    })

    let res = content

    console.log('Final str:')
    console.log(res)

    return {
      code: res,
    }
  }
}
