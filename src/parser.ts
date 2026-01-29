import hastToString from 'rehype-stringify'
import toMdast from 'remark-parse'
import mdastToHast from 'remark-rehype'
import { unified } from 'unified'
import { remarkSvelte } from './unified/micromark'

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
    const parse = unified()
      .use(toMdast)
      .use(remarkSvelte)
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

    return {
      code: content,
    }
  }
}
