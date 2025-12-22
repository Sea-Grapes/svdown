import { PluginConfig } from '.'
import { unified } from 'unified'
import toMdast from 'remark-parse'
import mdastToHast from 'remark-rehype'
import hastToString from 'rehype-stringify'
import { findBracket } from './bracket'

import { SKIP, visit } from 'unist-util-visit'
import type { Paragraph, Root, Text } from 'mdast'

export class SvmdParser {
  config: PluginConfig

  constructor(config?: PluginConfig) {
    // Todo: default config + merging
    this.config = config ?? {}
  }

  async parse(content: string, filename?: string): Promise<any> {
    const { str, logic } = escapeSvelteLogic(content)

    content = str

    console.log(content)

    const parse = unified()
      .use(toMdast)
      // .use(mdastLog)
      .use(mdastRestoreLogic, logic)
      .use(mdastToHast, {
        allowDangerousHtml: true,
        allowDangerousCharacters: true,
      })
      .use(hastToString, {
        allowDangerousHtml: true,
        allowDangerousCharacters: true,
      })

    let res = String(parse.processSync(content))

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

function mdastLog() {
  return (tree: any) => {
    console.dir(tree, { depth: null })
  }
}

function mdastRestoreLogic(logic: string[]) {
  console.log('restoring logic')
  let i = 0

  return (tree: Root) => {
    visit(tree, 'paragraph', (node: Paragraph, index, parent) => {
      const first = node.children[0]
      // console.log(node)

      if (
        first &&
        first.type == 'text' &&
        first.value.trim() == '+svmd0+' &&
        parent &&
        index != null
      ) {
        console.log('replacing')
        // Replace the entire paragraph with the restored logic
        parent.children[index] = {
          type: 'html',
          value: logic[i] || '',
        }
        i++
        return SKIP
      }
    })

    console.log(tree)
  }
}

const logic_start = /{[@#:/][a-z]+/g

function escapeSvelteLogic(str: string) {
  const matches = Array.from(str.matchAll(logic_start))
    .map((m) => m.index)
    .reverse()
  console.log(`found ${matches.length} matches`)

  let logic: string[] = []

  matches.forEach((start) => {
    let end = findBracket(str, start)
    console.log(`match from ${start}, ${end}`)
    logic.unshift(str.slice(start, end + 1))
    str = replaceStr(str, start, end + 1, `\n+svmd0+\n`)
  })

  return { str, logic }
}

function replaceStr(str: string, start: number, end: number, insert: string) {
  return str.slice(0, start) + insert + str.slice(end)
}
