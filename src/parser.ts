import hastToString from 'rehype-stringify'
import toMdast from 'remark-parse'
import mdastToHast from 'remark-rehype'
import { unified } from 'unified'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { visit } from 'unist-util-visit'
import {
  findSvelteBracketEnd,
  findJsBracketEnd,
  parseSvelteElement,
  SvelteElement,
} from './matchers'
import { replaceStrSection } from './util'
import type { Node, Root, Text } from 'mdast'
import { astInspect } from './dev'
import { inspect } from 'unist-util-inspect'
import MagicString from 'magic-string'

export async function parse(
  content: string,
  { config, filename }: { config?: PluginConfig; filename?: string } = {},
): Promise<string> {
  const parser = new SvmdParser(config)
  let res = await parser.parse(content, filename)
  return res
}

export interface PluginConfig {
  extensions?: string[]
  modifyFrontmatter?: Function
  allowMarkdownInHtml?: boolean
}

export class SvmdParser {
  config: PluginConfig

  static defaultConfig: PluginConfig = {
    allowMarkdownInHtml: true,
  }

  constructor(config?: PluginConfig) {
    // Todo: default config + merging
    config = {
      ...SvmdParser.defaultConfig,
      ...config,
    }

    this.config = config
  }

  async parse(content: string, filename?: string): Promise<any> {
    /**
     * Plan of action:
     * parse mdast to find code blocks & avoid those
     * look for basic html regex inside other ranges
     * parse html ranges & replace them w/ comment
     * collect text regions (inverse of html ranges)
     * parse text regions for all bracket ranges
     * replace bracket ranges w/ placeholder
     * - default: alphanumeric placeholder "+svmd0" or something
     * - logic blocks: html comment
     * - todo: escape user-entered alphanumeric placeholder
     * parse mdast
     * restore things afterwards
     */

    interface BracketData {
      start: number
      end: number
      text: string
      isSvelteLogic: boolean
    }

    let html: SvelteElement[] = []
    let brackets: BracketData[] = []

    {
      let str = new MagicString(content)

      // 1. avoid code & inlineCode
      let mdast = fromMarkdown(content)
      let avoid_ranges: Array<{ start: number; end: number }> = []
      visit(mdast, ['code', 'inlineCode'], (node: Node) => {
        if (
          node.position &&
          node.position.start.offset &&
          node.position.end.offset
        )
          avoid_ranges.push({
            start: node.position.start.offset,
            end: node.position.end.offset,
          })
      })
      avoid_ranges.sort((a, b) => a.start - b.start)

      let range = avoid_ranges.shift()
      let i = 0
      while (i < content.length) {
        const char = content[i]

        if (range && range.start <= i && i <= range.end) {
          i = range.end + 1
          range = avoid_ranges.shift()
          continue
        }

        if (char === '<') {
          const result = parseSvelteElement(content, i)
          if (result && typeof result === 'object') {
            str.update(
              result.start,
              result.end + 1,
              `\n<!--s-html-${html.length}-->\n`,
            )
            html.push(result)
            i = result.end + 1
          } else if (typeof result === 'number') {
            i = result
          } else i++
          continue
        }

        if (char === '{') {
          const end = findSvelteBracketEnd(content, i)
          if (end !== -1) {
            const text = content.slice(i, end + 1)
            const isSvelteLogic = /{[#:/@]\w+/.test(text)

            if (isSvelteLogic) {
              str.update(i, end + 1, `\n<!--s-brac-${brackets.length}-->\n`)
            } else {
              str.update(i, end + 1, `\uE000s-br-${brackets.length}`)
            }
            brackets.push({
              start: i,
              end,
              text,
              isSvelteLogic,
            })
            i = end + 1
          } else i++
          continue
        }

        i++
      }
      content = str.toString()
    }

    // console.log('\nhtml:')>
    // console.log(JSON.stringify(html, null, 2))

    function restoreSvelte() {
      return (tree: Root) => {
        visit(tree, (node: Node) => {
          if ('value' in node && typeof node.value === 'string') {
            const text = node as Text
            // todo: hide js expressions if needed
            text.value = text.value.replace(
              /<!--s-html-(\d+)-->/g,
              (_match, id) => html[Number(id)]?.text ?? _match,
            )

            text.value = text.value.replace(
              /\uE000s-br-(\d+)/g,
              (match, id) => {
                return brackets[Number(id)]?.text || match
              },
            )
          }
        })
      }
    }

    const parse = unified()
      .use(toMdast)
      .use(restoreSvelte)
      // .use(astInspect())
      .use(mdastToHast, {
        allowDangerousHtml: true,
        allowDangerousCharacters: true,
      })
      // .use(astInspect())
      .use(hastToString, {
        allowDangerousHtml: true,
        allowDangerousCharacters: true,
      })

    content = String(await parse.process(content))

    content = content.replace(/<!--s-brac-(\d+)-->/g, (match, id) => {
      return brackets[Number(id)]?.text || match
    })

    return {
      code: content,
    }
  }
}
