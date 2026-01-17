import hastToString from 'rehype-stringify'
import toMdast from 'remark-parse'
import mdastToHast from 'remark-rehype'
import { unified } from 'unified'
import { PluginConfig } from '.'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { visit } from 'unist-util-visit'
import { findBracket, findBracketCore, parseSvelteElement } from './matchers'
import { replaceStrSection } from './util'
import type { Node, Root, Text } from 'mdast'
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
    const html_regex = /<\/?[\w.:]+/g

    let html = []

    console.log('here')
    for (const match of content.matchAll(html_regex)) {
      const pos = match.index
      let element = parseSvelteElement(content, pos)
      if (element) html.push(element)
    }

    console.log(JSON.stringify(html, null, 2))

    function restoreBrackets() {
      return (tree: Root) => {
        visit(tree, ['text', 'html'], (node: Node) => {
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
      .use(restoreBrackets)
      .use(astInspect())
      .use(mdastToHast, {
        allowDangerousHtml: true,
        // allowDangerousCharacters: true,
      })
      .use(astInspect())
      .use(hastToString, {
        allowDangerousHtml: true,
        // allowDangerousCharacters: true,
      })

    return {
      code: content,
    }
  }
}
