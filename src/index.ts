import { SvmdParser } from './parser'

export interface PluginConfig {
  extensions?: string[]
  modifyFrontmatter?: Function
}

export function markdown(config: PluginConfig) {
  let parser = new SvmdParser(config)

  return {
    name: 'markdown',
    markup({ content, filename }: { content: string; filename: string }): any {
      console.log('got a file request')

      if (filename.endsWith('.md')) {
        return parser.parse(content, filename)
      }
    },
  }
}

export * from './parser'
