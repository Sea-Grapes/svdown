const DEFAULT_CONFIG = {
  partialNodes: {
    text: 'truncate',
    code: 'truncate',
    inlineCode: 'truncate',
    formatting: 'preserve',
    media: 'preserve',
    blocks: 'include',
  },
  textHandling: {
    boundaries: 'trim',
    mergeAdjacent: true,
    preserveLineBreaks: true,
  },
  content: {
    includeHidden: false,
    includeReferences: false,
    includeFootnotes: false,
  },
}

const isParent = (node) => 'children' in node && Array.isArray(node.children)

const isText = (node) => node?.type === 'text'

const isCode = (node) => node?.type === 'code'

const isInlineCode = (node) => node?.type === 'inlineCode'

const isFormatting = (node) =>
  ['emphasis', 'strong', 'delete', 'underline'].includes(node?.type)

const isMedia = (node) =>
  ['link', 'linkReference', 'image', 'imageReference'].includes(node?.type)

const isBlock = (node) =>
  ['paragraph', 'heading', 'blockquote', 'listItem'].includes(node?.type)

const calculateLength = (node) => {
  if (node.value) {
    return node.value.length
  }

  if (isParent(node)) {
    return node.children.reduce((sum, child) => sum + calculateLength(child), 0)
  }

  return 0
}

const lengthCache = new WeakMap()

const getLength = (node) => {
  if (!node) return 0

  if (lengthCache.has(node)) {
    return lengthCache.get(node)
  }

  const length = calculateLength(node)
  lengthCache.set(node, length)
  return length
}

const sliceNodeWithValue = (node, nodeStart, context) => {
  const { start, end, config } = context
  const nodeEnd = nodeStart + node.value.length

  if (nodeEnd <= start || nodeStart >= end) {
    return null
  }

  if (nodeStart >= start && nodeEnd <= end) {
    return { ...node }
  }

  context.info.hasPartialNodes = true
  context.info.modifiedNodeTypes.add(node.type)

  const behavior = config.partialNodes[node.type] ?? config.partialNodes.text

  if (behavior === 'include-full') {
    return { ...node }
  }

  if (behavior === 'exclude-full') {
    return null
  }

  const sliceStart = Math.max(0, start - nodeStart)
  const sliceEnd = Math.min(node.value.length, end - nodeStart)
  let slicedValue = node.value.slice(sliceStart, sliceEnd)

  const isCodeLike = isInlineCode(node) || isCode(node)

  if (!isCodeLike) {
    if (config.textHandling.boundaries === 'trim') {
      const isAtStart = nodeStart === start
      const isAtEnd = nodeEnd === end

      if (!isAtStart && !isAtEnd) {
        slicedValue = slicedValue.trim()
      } else if (!isAtStart) {
        slicedValue = slicedValue.trimStart()
      } else if (!isAtEnd) {
        slicedValue = slicedValue.trimEnd()
      }
    } else if (config.textHandling.boundaries === 'normalize') {
      slicedValue = slicedValue.replace(/\s+/g, ' ')
    }
  }

  return slicedValue.length > 0 ? { ...node, value: slicedValue } : null
}

const sliceFormatting = (node, nodeStart, context) => {
  const { start, end, config } = context
  const nodeLength = getLength(node)
  const nodeEnd = nodeStart + nodeLength

  if (nodeEnd <= start || nodeStart >= end) {
    return null
  }

  if (nodeStart >= start && nodeEnd <= end) {
    return isParent(node) ? sliceParent(node, nodeStart, context) : { ...node }
  }

  context.info.hasPartialNodes = true
  context.info.modifiedNodeTypes.add(node.type)

  const behavior = config.partialNodes.formatting

  if (behavior === 'strip') {
    if (isParent(node)) {
      const slicedParent = sliceParent(node, nodeStart, context)
      return slicedParent ? slicedParent.children : null
    }
    return null
  }

  if (behavior === 'extend') {
    return isParent(node) ? sliceParent(node, nodeStart, context) : { ...node }
  }

  return isParent(node) ? sliceParent(node, nodeStart, context) : { ...node }
}

const sliceMedia = (node, nodeStart, context) => {
  const { start, end, config } = context
  const nodeLength = getLength(node)
  const nodeEnd = nodeStart + nodeLength

  if (nodeEnd <= start || nodeStart >= end) {
    return null
  }

  if (nodeStart >= start && nodeEnd <= end) {
    return isParent(node) ? sliceParent(node, nodeStart, context) : { ...node }
  }

  context.info.hasPartialNodes = true
  context.info.modifiedNodeTypes.add(node.type)

  const behavior = config.partialNodes.media

  if (behavior === 'strip') {
    return null
  }

  if (behavior === 'content-only') {
    if (isParent(node)) {
      const slicedParent = sliceParent(node, nodeStart, context)
      return slicedParent ? slicedParent.children : null
    }
    return null
  }

  return isParent(node) ? sliceParent(node, nodeStart, context) : { ...node }
}

const sliceBlock = (node, nodeStart, context) => {
  const { start, end, config } = context
  const nodeLength = getLength(node)
  const nodeEnd = nodeStart + nodeLength

  if (nodeEnd <= start || nodeStart >= end) {
    return null
  }

  if (nodeStart >= start && nodeEnd <= end) {
    return isParent(node) ? sliceParent(node, nodeStart, context) : { ...node }
  }

  context.info.hasPartialNodes = true
  context.info.modifiedNodeTypes.add(node.type)

  const behavior = config.partialNodes.blocks

  if (behavior === 'exclude') {
    return null
  }

  if (behavior === 'unwrap') {
    if (isParent(node)) {
      const slicedParent = sliceParent(node, nodeStart, context)
      return slicedParent ? slicedParent.children : null
    }
    return null
  }

  return isParent(node) ? sliceParent(node, nodeStart, context) : { ...node }
}

const sliceParent = (node, nodeStart, context) => {
  const children = []
  let childPosition = nodeStart

  for (const child of node.children) {
    const result = sliceNode(child, childPosition, context)
    const childLength = getLength(child)

    if (result) {
      if (Array.isArray(result)) {
        children.push(...result)
      } else {
        children.push(result)
      }
    }

    childPosition += childLength
  }

  const finalChildren = context.config.textHandling.mergeAdjacent
    ? mergeAdjacentText(children)
    : children

  if (finalChildren.length === 0) {
    return null
  }

  return { ...node, children: finalChildren }
}

const sliceNode = (node, nodeStart, context) => {
  if (node.value) {
    return sliceNodeWithValue(node, nodeStart, context)
  }

  if (isFormatting(node)) {
    return sliceFormatting(node, nodeStart, context)
  }

  if (isMedia(node)) {
    return sliceMedia(node, nodeStart, context)
  }

  if (isBlock(node)) {
    return sliceBlock(node, nodeStart, context)
  }

  if (isParent(node)) {
    return sliceParent(node, nodeStart, context)
  }

  const nodeLength = getLength(node)
  const nodeEnd = nodeStart + nodeLength
  const overlaps = nodeEnd > context.start && nodeStart < context.end

  return overlaps ? { ...node } : null
}

const mergeAdjacentText = (nodes) => {
  const result = []

  for (const node of nodes) {
    const last = result[result.length - 1]

    if (last && isText(last) && isText(node)) {
      const merged = {
        ...last,
        value: last.value + node.value,
      }
      result[result.length - 1] = merged
    } else {
      result.push(node)
    }
  }

  return result
}

const slice = (tree, start, end, config = {}) => {
  if (!tree || start < 0) {
    return {
      node: null,
      boundaries: { start: 0, end: 0 },
      info: {
        originalLength: 0,
        slicedLength: 0,
        hasPartialNodes: false,
        modifiedNodeTypes: [],
      },
    }
  }

  const resolvedConfig = { ...DEFAULT_CONFIG, ...config }
  const originalLength = getLength(tree)
  const actualEnd =
    end !== undefined ? Math.min(end, originalLength) : originalLength

  if (start >= actualEnd) {
    return {
      node: null,
      boundaries: { start, end: actualEnd },
      info: {
        originalLength,
        slicedLength: 0,
        hasPartialNodes: false,
        modifiedNodeTypes: [],
      },
    }
  }

  const context = {
    start,
    end: actualEnd,
    config: resolvedConfig,
    info: {
      hasPartialNodes: false,
      modifiedNodeTypes: new Set(),
    },
  }

  const result = sliceNode(tree, 0, context)
  const finalNode = Array.isArray(result) ? null : result

  return {
    node: finalNode,
    boundaries: { start, end: actualEnd },
    info: {
      originalLength,
      slicedLength: finalNode ? getLength(finalNode) : 0,
      hasPartialNodes: context.info.hasPartialNodes,
      modifiedNodeTypes: Array.from(context.info.modifiedNodeTypes),
    },
  }
}

const length = (tree) => getLength(tree)

const findText = (tree, searchText) => {
  if (searchText.length < 1) {
    return []
  }

  const positions = []
  let offset = 0

  const traverse = (node) => {
    if (isText(node)) {
      let index = 0
      while ((index = node.value.indexOf(searchText, index)) !== -1) {
        positions.push(offset + index)
        index++
      }
      offset += node.value.length
    } else if (isCode(node) || isInlineCode(node)) {
      let index = 0
      while ((index = node.value.indexOf(searchText, index)) !== -1) {
        positions.push(offset + index)
        index++
      }
      offset += node.value.length
    } else if (isParent(node)) {
      for (const child of node.children) {
        traverse(child)
      }
    }
  }

  traverse(tree)
  return positions
}

const presets = {
  textOnly: {
    partialNodes: {
      formatting: 'strip',
      media: 'content-only',
      blocks: 'unwrap',
    },
    textHandling: {
      boundaries: 'trim',
      mergeAdjacent: true,
    },
  },

  structured: {
    partialNodes: {
      text: 'truncate',
      formatting: 'preserve',
      blocks: 'include',
    },
  },

  inclusive: {
    partialNodes: {
      text: 'include-full',
      code: 'include-full',
      formatting: 'extend',
      blocks: 'include',
    },
  },

  conservative: {
    partialNodes: {
      text: 'truncate',
      code: 'exclude-full',
      formatting: 'strip',
      blocks: 'exclude',
    },
  },
}

window.mdcut = {
  slice,
  length,
  findText,
  presets,
}
