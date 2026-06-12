import { parse, SvdownConfig } from './parser'

export function markdown(config: SvdownConfig) {
  return {
    name: 'markdown',
    markup({ content, filename }: { content: string; filename: string }): any {
      console.log('got a file request')

      if (filename.endsWith('.md')) {
        return parse(content, config)
      }
    },
  }
}

export * from './parser'
