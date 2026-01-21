function findHighestBracketPairs(str) {
  const pairs = []
  const stack = []
  let maxDepth = 0

  // First pass: find all pairs and their depths
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '{') {
      stack.push(i)
    } else if (str[i] === '}') {
      if (stack.length > 0) {
        const openIdx = stack.pop()
        const depth = stack.length
        pairs.push({ open: openIdx, close: i, depth })
        maxDepth = Math.max(maxDepth, depth)
      }
    }
  }

  // Second pass: filter pairs at max depth
  return pairs.filter((p) => p.depth === maxDepth)
}

function findHighestBracketPairs(str) {
  const pairs = []
  const openBrackets = []
  let depth = 0
  let minDepth = Infinity

  for (let i = 0; i < str.length; i++) {
    if (str[i] === '{') {
      openBrackets.push(i)
      depth++
    } else if (str[i] === '}') {
      if (openBrackets.length > 0) {
        const openIdx = openBrackets.pop()
        pairs.push({ open: openIdx, close: i, depth })
        minDepth = Math.min(minDepth, depth)
        depth--
      }
    }
  }

  // Filter pairs at minimum depth (shallowest/highest level)
  return pairs.filter((p) => p.depth === minDepth)
}
