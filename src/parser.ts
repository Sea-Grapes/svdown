import { PluginConfig } from '.'
import { unified } from 'unified'
import toMdast from 'remark-parse'
import mdastToHast from 'remark-rehype'
import hastToString from 'rehype-stringify'
import { findBracket } from './bracket'

import { parse as svparse } from 'svelte/compiler'
import { SKIP, visit } from 'unist-util-visit'
import type { Paragraph, Root, Text } from 'mdast'
import { astInspect } from './util'

export class SvmdParser {
  config: PluginConfig

  constructor(config?: PluginConfig) {
    // Todo: default config + merging
    this.config = config ?? {}
  }

  async parse(content: string, filename?: string): Promise<any> {
    console.log('start str:')
    console.log(content)

    

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

export async function parse(
  content: string,
  { config, filename }: { config?: PluginConfig; filename?: string } = {}
): Promise<string> {
  const parser = new SvmdParser(config)
  let res = await parser.parse(content, filename)
  return res
}
