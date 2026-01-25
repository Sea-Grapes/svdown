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

    let html: SvelteElement[] = []

    {
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
            html.push(result)
            i = result.end + 1
          } else if (typeof result === 'number') {
            i = result
          } else i++
          continue
        }

        i++
      }
    }

    // replacing w/ comments allows markdown to parse inside html
    html.toReversed().forEach((node, i) => {
      content = replaceStrSection(
        content,
        node.start,
        node.end + 1,
        `\n<!--svdown-${html.length - 1 - i}-->\n`,
      )
    })

    // console.log('\nhtml:')>
    // console.log(JSON.stringify(html, null, 2))

    function restoreSvelte() {
      return (tree: Root) => {
        visit(tree, ['text', 'html'], (node: Node) => {
          if ('value' in node && typeof node.value === 'string') {
            // todo: hide js expressions if needed
            node.value = node.value.replace(
              /<!--svdown-(\d+)-->/g,
              (_match, id) => html[Number(id)]?.text ?? _match,
            )
          }

          if (
            node.type === 'text' &&
            'value' in node &&
            typeof node.value === 'string' &&
            node.value.includes('svmd0')
          ) {
            // node.value = node.value.replaceAll('svmd0', () => {
            //   return js_brackets.pop()?.text || 'svmd0'
            // })
          } else if (node.type === 'html') {
            // let next = js_brackets.pop()
            // next && ht_brackets.push(next)
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
        // allowDangerousCharacters: true,
      })
      // .use(astInspect())
      .use(hastToString, {
        allowDangerousHtml: true,
        // allowDangerousCharacters: true,
      })

    content = String(await parse.process(content))

    return {
      code: content,
    }
  }
}
