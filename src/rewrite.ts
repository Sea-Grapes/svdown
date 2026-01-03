import hastToString from 'rehype-stringify'
import toMdast from 'remark-parse'
import mdastToHast from 'remark-rehype'
import { unified } from 'unified'
import { PluginConfig } from '.'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { visit } from 'unist-util-visit'
import { findBracket } from './bracket'
import { replaceStrSection } from './util'
import type { Node, Root } from 'mdast'
import { astInspect } from './dev'

export async function parse(
  content: string,
  { config, filename }: { config?: PluginConfig; filename?: string } = {}
): Promise<string> {
  const parser = new SvmdParser(config)
  let res = await parser.parse(content, filename)
  return res
}

type BracketType = 'js-expression' | 'svelte-logic' | 'attach-directive'

interface BracketPair {
  start: number
  end: number
  text: string
  type: BracketType
}

interface TextRange {
  start: number
  end: number
}

export class SvmdParser {
  config: PluginConfig

  constructor(config?: PluginConfig) {
    this.config = config ?? {}
  }

  async parse(content: string, filename?: string): Promise<any> {
    console.log('start str:')
    console.log(content)

    const { content: prefixedContent, prefixes } =
      this.hideSvelteCustom(content)
    content = prefixedContent

    // Phase 2: Get text ranges from mdast
    const textRanges = this.getTextRanges(content)
    console.log('\ntext_ranges:')
    console.log(textRanges)

    // Phase 3: Find and classify all bracket pairs
    const bracketPairs = this.findBracketPairs(content, textRanges)
    console.log('\nbracket_pairs:')
    console.log(bracketPairs)

    // Phase 4: Replace brackets with placeholders
    const { content: processedContent, replacements } =
      this.replaceWithPlaceholders(content, bracketPairs)
    content = processedContent

    // Phase 5: Parse markdown to HTML
    content = await this.parseMarkdownToHtml(content, replacements)

    // Phase 6: Restore placeholders
    content = this.restorePlaceholders(content, replacements, prefixes)

    console.log('Final str:')
    console.log(content)

    return { code: content }
  }

  private hideSvelteCustom(content: string): {
    content: string
    prefixes: string[]
  } {
    const prefixes: string[] = []
    content = content.replace(/svelte:(\w+)/g, (match) => {
      prefixes.push(match)
      return 'svmd2'
    })
    return { content, prefixes }
  }

  // ==========================================================================
  // Phase 2: Get Text Ranges
  // ==========================================================================

  private getTextRanges(content: string): TextRange[] {
    const mdast = fromMarkdown(content)
    const textRanges: TextRange[] = []

    console.log('\nmdast:')
    console.log(mdast)

    visit(mdast, ['text', 'html'], (node: Node) => {
      // @ts-ignore
      const text: string = node.value

      if (!text.includes('{')) return

      // Skip script and style tags
      if (node.type === 'html') {
        const tag = text.match(/\w+/)?.[0] || ''
        if (['script', 'style'].includes(tag)) return
      }

      if (
        node.position &&
        typeof node.position.start.offset === 'number' &&
        typeof node.position.end.offset === 'number'
      ) {
        textRanges.push({
          start: node.position.start.offset,
          end: node.position.end.offset,
        })
      }
    })

    return textRanges.sort((a, b) => a.start - b.start)
  }

  // ==========================================================================
  // Phase 3: Find and Classify Brackets
  // ==========================================================================

  private findBracketPairs(
    content: string,
    textRanges: TextRange[]
  ): BracketPair[] {
    const bracketPairs: BracketPair[] = []

    for (const range of textRanges) {
      let i = range.start

      while (i < range.end) {
        if (content[i] === '{') {
          const end = findBracket(content, i)

          if (end !== -1 && end < content.length) {
            const pairEnd = end + 1
            const text = content.slice(i, pairEnd)
            const type = this.classifyBracket(text)

            bracketPairs.push({
              start: i,
              end: pairEnd,
              text,
              type,
            })

            i = pairEnd
          } else {
            i++
          }
        } else {
          i++
        }
      }
    }

    return bracketPairs
  }

  private classifyBracket(text: string): BracketType {
    if (text.startsWith('{@attach')) {
      return 'attach-directive'
    } else if (/{[#:/@]\w+/.test(text)) {
      return 'svelte-logic'
    } else {
      return 'js-expression'
    }
  }

  // ==========================================================================
  // Phase 4: Replace with Placeholders
  // ==========================================================================

  private replaceWithPlaceholders(
    content: string,
    bracketPairs: BracketPair[]
  ): {
    content: string
    replacements: Map<BracketType, BracketPair[]>
  } {
    const replacements = new Map<BracketType, BracketPair[]>([
      ['js-expression', []],
      ['svelte-logic', []],
      ['attach-directive', []],
    ])

    // Process in reverse order to maintain correct indices
    const sortedPairs = [...bracketPairs].sort((a, b) => b.start - a.start)

    for (const pair of sortedPairs) {
      const placeholder = this.getPlaceholder(pair.type)
      content = replaceStrSection(content, pair.start, pair.end, placeholder)
      replacements.get(pair.type)!.push(pair)
    }

    return { content, replacements }
  }

  private getPlaceholder(type: BracketType): string {
    switch (type) {
      case 'js-expression':
        return 'svmd0'
      case 'attach-directive':
        return 'svmd1'
      case 'svelte-logic':
        return '<!--svmd:logic-->'
    }
  }

  // ==========================================================================
  // Phase 5: Parse Markdown to HTML
  // ==========================================================================

  private async parseMarkdownToHtml(
    content: string,
    replacements: Map<BracketType, BracketPair[]>
  ): Promise<string> {
    const jsExpressions = replacements.get('js-expression')!
    const htmlBrackets: BracketPair[] = []

    function restoreBrackets() {
      return (tree: Root) => {
        visit(tree, ['text', 'html'], (node: Node) => {
          if (
            node.type === 'text' &&
            'value' in node &&
            typeof node.value === 'string' &&
            node.value.includes('svmd0')
          ) {
            node.value = node.value.replaceAll('svmd0', () => {
              return jsExpressions.pop()?.text || 'svmd0'
            })
          } else if (node.type === 'html') {
            const next = jsExpressions.pop()
            if (next) htmlBrackets.push(next)
          }
        })
      }
    }

    const processor = unified()
      .use(toMdast)
      .use(restoreBrackets)
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

    content = String(processor.processSync(content))

    // Store html brackets back in replacements for final restoration
    replacements.set('js-expression', htmlBrackets)

    return content
  }

  // ==========================================================================
  // Phase 6: Restore Placeholders
  // ==========================================================================

  private restorePlaceholders(
    content: string,
    replacements: Map<BracketType, BracketPair[]>,
    prefixes: string[]
  ): string {
    // Restore svelte logic blocks
    const svelteLogic = replacements.get('svelte-logic')!
    content = content.replaceAll('<!--svmd:logic-->', () => {
      return svelteLogic.pop()?.text || '<!--svmd:logic-->'
    })

    // Restore attach directives
    const attachDirectives = replacements.get('attach-directive')!
    content = content.replaceAll('svmd1', () => {
      return attachDirectives.pop()?.text || 'svmd1'
    })

    // Restore svelte prefixes
    content = content.replaceAll('svmd2', () => {
      return prefixes.shift() || 'svmd2'
    })

    // Restore HTML brackets (js expressions that ended up in HTML nodes)
    const htmlBrackets = replacements.get('js-expression')!
    content = content.replaceAll('svmd0', () => {
      return htmlBrackets.pop()?.text || 'svmd0'
    })

    return content
  }
}
