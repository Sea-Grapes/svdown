import string_to_mdast from 'remark-parse'
import mdast_to_hast from 'remark-rehype'
import hast_to_string from 'rehype-stringify'
import { unified } from 'unified'
import { astInspect } from './dev'

export interface SvdownConfig {
  extensions?: string[]
  modifyFrontmatter?: Function
}

export async function parse(text: string, config: SvdownConfig) {
  const parse = unified()
    .use(string_to_mdast)
    .use(astInspect())
    .use(mdast_to_hast, {
      allowDangerousHtml: true,
      allowDangerousCharacters: true,
    })
    // .use(astInspect())
    .use(hast_to_string, {
      allowDangerousHtml: true,
      allowDangerousCharacters: true,
    })

  text = String(await parse.process(text))

  return {
    code: text,
  }
}
