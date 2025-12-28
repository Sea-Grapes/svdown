import hastToString from 'rehype-stringify'
import toMdast from 'remark-parse'
import mdastToHast from 'remark-rehype'
import { unified } from 'unified'
import { PluginConfig } from '.'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { visit } from 'unist-util-visit'

import { astInspect, replaceStrSection } from './util'
import { findBracketEnd } from './bracket'

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
    console.log(mdast)
    visit(mdast, 'text', (node) => {
      // fumb typescript
      if (
        node.position &&
        node.position.start.offset &&
        node.position.end.offset
      ) {
        text_ranges.push({
          start: node.position.start.offset,
          end: node.position.end.offset,
        })
      }
    })
    text_ranges.sort((a, b) => a.start - b.start)

    let bracket_pairs: Array<{ start: number; end: number }> = []

    for (const range of text_ranges) {
      let i = range.start
      // Todo: eval efficiency (can reuse bracket knowledge)
      while (i < range.end) {
        if (content[i] === '{') {
          const end = findBracketEnd(content, i)
          if (end !== -1 && end < range.end) {
            // We found a bracket pair
            bracket_pairs.push({ start: i, end })
            i = end + 1
          } else i++
        } else i++
      }
    }

    bracket_pairs.reverse().forEach((pair) => {
      content = replaceStrSection(content, pair.start, pair.end, 'svmd0')
    })

    const parse = unified()
      .use(toMdast)
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
