import { parse as parseSvelte } from 'svelte/compiler'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import type { Root, Node, Parent, Text, HTML, RootContent } from 'mdast'

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

interface SourceRange {
  start: number
  end: number
}

interface SvelteProtectedRange extends SourceRange {
  /** The raw original source for this range */
  content: string
}

// ------------------------------------------------------------
// Phase 1: Find ranges to blank before Svelte parse
// (code blocks, inline code, math, etc.)
// ------------------------------------------------------------

function findMarkdownProtectedRanges(mdast: Root): SourceRange[] {
  const ranges: SourceRange[] = []

  function walk(node: Node) {
    if (
      node.type === 'code' ||
      node.type === 'inlineCode' ||
      node.type === 'math' ||       // remark-math
      node.type === 'inlineMath'    // remark-math
    ) {
      if (node.position) {
        ranges.push({
          start: node.position.start.offset!,
          end: node.position.end.offset!,
        })
      }
      return // don't recurse into these
    }
    if ('children' in node) {
      for (const child of (node as Parent).children) walk(child)
    }
  }

  walk(mdast)
  return ranges
}

// Blank out ranges in source so Svelte's parser doesn't choke.
// We replace with spaces to preserve offsets.
function blankRanges(source: string, ranges: SourceRange[]): string {
  const chars = source.split('')
  for (const { start, end } of ranges) {
    for (let i = start; i < end; i++) {
      // Keep newlines so line structure is preserved for Svelte
      if (chars[i] !== '\n') chars[i] = ' '
    }
  }
  return chars.join('')
}

// ------------------------------------------------------------
// Phase 2: Extract Svelte-specific ranges from Svelte AST
// ------------------------------------------------------------

function findSvelteRanges(svelteAst: any): SvelteProtectedRange[] {
  const ranges: SvelteProtectedRange[] = []

  // Walk Svelte's ESTree-like AST.
  // Svelte gives us start/end as character offsets directly.
  function walk(node: any) {
    if (!node || typeof node !== 'object') return

    switch (node.type) {
      // {expression}
      case 'MustacheTag':
      case 'RawMustacheTag':
        ranges.push({ start: node.start, end: node.end, content: '' })
        return // don't recurse — we want the whole expression as one unit

      // {#if}{:else}{/if} — collect the tag ranges individually,
      // NOT the entire block, so markdown inside the block is still parsed
      case 'IfBlock':
        // {#if condition}  →  node.start to first child's start
        // {:else} / {:else if}  →  branch boundaries
        // {/if}  →  node.end - a few chars; easier to use node.end directly
        pushBlockTagRanges(node, ranges)
        // recurse into children so nested svelte nodes are found
        for (const child of node.children ?? []) walk(child)
        for (const child of node.else?.children ?? []) walk(child)
        return

      case 'EachBlock':
        pushBlockTagRanges(node, ranges)
        for (const child of node.children ?? []) walk(child)
        for (const child of node.else?.children ?? []) walk(child)
        return

      case 'AwaitBlock':
        pushBlockTagRanges(node, ranges)
        for (const child of node.pending?.children ?? []) walk(child)
        for (const child of node.then?.children ?? []) walk(child)
        for (const child of node.catch?.children ?? []) walk(child)
        return

      // <Component /> or <svelte:element> — treat as opaque
      case 'InlineComponent':
      case 'Element':
        if (isComponentOrSpecial(node)) {
          ranges.push({ start: node.start, end: node.end, content: '' })
          return
        }
        break

      // {@html ...}, {@debug ...}, {@const ...}
      case 'RawMustacheTag':
      case 'DebugTag':
      case 'ConstTag':
        ranges.push({ start: node.start, end: node.end, content: '' })
        return
    }

    // generic recurse
    for (const key of Object.keys(node)) {
      const val = node[key]
      if (Array.isArray(val)) val.forEach(walk)
      else if (val && typeof val === 'object' && val.type) walk(val)
    }
  }

  const fragment = svelteAst.html ?? svelteAst.fragment
  walk(fragment)
  return ranges
}

function isComponentOrSpecial(node: any): boolean {
  const name: string = node.name ?? ''
  // Components start with uppercase, or are svelte: special elements
  return /^[A-Z]/.test(name) || name.startsWith('svelte:')
}

// For block tags like {#if}{/if}, we want only the opening/closing/branch
// tag ranges — not the content between them — so markdown inside is preserved.
// Svelte's AST stores the block node's start/end as the whole block, but
// we can derive the tag ranges from child positions.
function pushBlockTagRanges(node: any, ranges: SvelteProtectedRange[]) {
  const children: any[] = node.children ?? []
  const firstChildStart = children[0]?.start ?? node.end

  // Opening tag: node.start → first child start
  ranges.push({ start: node.start, end: firstChildStart, content: '' })

  // If there's an else branch, find the boundary
  if (node.else) {
    const elseChildren: any[] = node.else.children ?? []
    const lastMainChild = children[children.length - 1]
    const firstElseChild = elseChildren[0]

    if (lastMainChild && firstElseChild) {
      // The {:else} tag sits between them
      ranges.push({
        start: lastMainChild.end,
        end: firstElseChild.start,
        content: '',
      })
    }
  }

  // Closing tag: last child end → node.end
  const lastChild = (node.else?.children ?? children).slice(-1)[0]
  if (lastChild) {
    ranges.push({ start: lastChild.end, end: node.end, content: '' })
  }
}

// Fill in the actual source content for each range
function fillRangeContent(ranges: SvelteProtectedRange[], source: string): SvelteProtectedRange[] {
  return ranges.map(r => ({ ...r, content: source.slice(r.start, r.end) }))
}

// ------------------------------------------------------------
// Phase 3: Reconcile mdast nodes with Svelte ranges
// ------------------------------------------------------------

function overlaps(node: Node, range: SourceRange): boolean {
  if (!node.position) return false
  const nStart = node.position.start.offset!
  const nEnd = node.position.end.offset!
  return nStart < range.end && nEnd > range.start
}

function fullyContained(node: Node, range: SourceRange): boolean {
  if (!node.position) return false
  const nStart = node.position.start.offset!
  const nEnd = node.position.end.offset!
  return nStart >= range.start && nEnd <= range.end
}

function makeHtmlNode(content: string, start: number, end: number): HTML {
  return {
    type: 'html',
    value: content,
    position: {
      start: { line: 0, column: 0, offset: start },
      end: { line: 0, column: 0, offset: end },
    },
  }
}

// Split a text node around a svelte range that falls inside it.
// Returns an array of replacement nodes.
function splitTextNode(
  node: Text,
  range: SvelteProtectedRange,
  source: string
): RootContent[] {
  const nodeStart = node.position!.start.offset!
  const nodeEnd = node.position!.end.offset!

  const result: RootContent[] = []

  if (range.start > nodeStart) {
    result.push({
      type: 'text',
      value: source.slice(nodeStart, range.start),
      position: {
        start: node.position!.start,
        end: { line: 0, column: 0, offset: range.start },
      },
    } as Text)
  }

  result.push(makeHtmlNode(range.content, range.start, range.end))

  if (range.end < nodeEnd) {
    result.push({
      type: 'text',
      value: source.slice(range.end, nodeEnd),
      position: {
        start: { line: 0, column: 0, offset: range.end },
        end: node.position!.end,
      },
    } as Text)
  }

  return result
}

// Core recursive reconciler.
// Returns a new children array with Svelte ranges replaced by html nodes.
function reconcileChildren(
  children: RootContent[],
  svelteRanges: SvelteProtectedRange[],
  source: string
): RootContent[] {
  const result: RootContent[] = []
  let i = 0

  while (i < children.length) {
    const node = children[i]

    // Find all svelte ranges that overlap this node
    const overlapping = svelteRanges.filter(r => overlaps(node, r))

    if (overlapping.length === 0) {
      // No overlap — if it has children, recurse; otherwise keep as-is
      if ('children' in node) {
        result.push({
          ...node,
          children: reconcileChildren((node as Parent).children as RootContent[], svelteRanges, source),
        } as RootContent)
      } else {
        result.push(node)
      }
      i++
      continue
    }

    // Case: one svelte range is fully contained in a text node → split it
    if (node.type === 'text' && overlapping.length === 1 && !fullyContained(node, overlapping[0])) {
      const split = splitTextNode(node as Text, overlapping[0], source)
      // The after-text piece might still overlap another svelte range, recurse
      result.push(...reconcileChildren(split, svelteRanges, source))
      i++
      continue
    }

    // Case: a svelte range spans multiple sibling nodes.
    // Collect all siblings that are touched by any of the overlapping ranges,
    // replace the whole span with one html node per svelte range.
    const rangeStart = Math.min(...overlapping.map(r => r.start))
    const rangeEnd = Math.max(...overlapping.map(r => r.end))

    // Consume siblings until we're past rangeEnd
    let j = i
    while (j < children.length) {
      const nEnd = children[j].position?.end.offset ?? 0
      if (nEnd > rangeEnd) break
      j++
    }
    // j is now the first sibling NOT consumed

    // Emit one html node per overlapping svelte range (they shouldn't overlap each other)
    for (const r of overlapping.sort((a, b) => a.start - b.start)) {
      result.push(makeHtmlNode(r.content, r.start, r.end))
    }

    i = j
  }

  return result
}

// ------------------------------------------------------------
// Top-level pipeline
// ------------------------------------------------------------

export async function preprocessMarkdownSvelte(source: string): Promise<Root> {
  // 1. Parse mdast (Svelte syntax may be mangled here, that's ok)
  const processor = unified().use(remarkParse) // add your plugins here
  const mdast = processor.parse(source) as Root

  // 2. Find ranges to blank for Svelte's parser
  const mdProtected = findMarkdownProtectedRanges(mdast)
  const sanitized = blankRanges(source, mdProtected)

  // 3. Parse Svelte AST on the sanitized source
  let svelteAst: any
  try {
    svelteAst = parseSvelte(sanitized, { filename: 'source.svelte' })
  } catch (e) {
    // If Svelte still chokes, fall back to returning the plain mdast.
    // Could also try expanding mdProtected to cover more node types.
    console.warn('Svelte parse failed, returning plain mdast', e)
    return mdast
  }

  // 4. Extract Svelte-specific ranges, fill with original source content
  const svelteRanges = fillRangeContent(findSvelteRanges(svelteAst), source)

  if (svelteRanges.length === 0) return mdast

  // 5. Reconcile: replace mangled mdast nodes with html nodes for Svelte ranges
  const reconciledChildren = reconcileChildren(
    mdast.children as RootContent[],
    svelteRanges,
    source
  )

  return { ...mdast, children: reconciledChildren }
}