import { PluginConfig } from '.'
import { unified } from 'unified'
import toMdast from 'remark-parse'
import mdastToHast from 'remark-rehype'
import hastToString from 'rehype-stringify'
import { findBracket } from './bracket'

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

const logic_start = /{[@#:/][a-z]+/g

function escapeSvelteLogic(str: string) {
  const matches = Array.from(str.matchAll(logic_start)).map((m) => m.index)
  console.log(`found ${matches.length} matches`)

  let logic: string[] = []

  matches.forEach((start) => {
    let end = findBracket(str, start) + 1
    console.log(`match from ${start}, ${end}`)
    logic.push(str.slice(start, end))
    str = replaceStr(str, start, end, `\n+svmd0+\n`)
  })

  return { str, logic }
}

function replaceStr(str: string, start: number, end: number, insert: string) {
  return str.slice(0, start) + insert + str.slice(end)
}
