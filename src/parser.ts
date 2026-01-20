import hastToString from 'rehype-stringify'
import toMdast from 'remark-parse'
import mdastToHast from 'remark-rehype'
import { unified } from 'unified'
import { PluginConfig } from '.'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { visit } from 'unist-util-visit'
import {
  findBracket,
  findBracketCore,
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

export class SvmdParser {
  config: PluginConfig

  constructor(config?: PluginConfig) {
    // Todo: default config + merging
    this.config = config ?? {}
  }

  async parse(content: string, filename?: string): Promise<any> {
    const html_regex = /<\/?[\w.:]+/g

    let html: SvelteElement[] = []

    console.log('here')
    for (const match of content.matchAll(html_regex)) {
      const element = parseSvelteElement(content, match.index)
      if (element) {
        html.push(element)
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
