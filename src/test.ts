export function findBrackets(str: string, start: number, end: number) {
  const res = []
  const stack = []
  let minDepth = Infinity

  for (let i = start; i <= end; i++) {
    const char = str[i]

    if (char === '{') {
      stack.push(i)
    }

    else if(char === '}') {
      if(stack.length > 0) {
        const startPos = stack.pop()
      }
    }
  }
}