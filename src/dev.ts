import { inspect } from 'unist-util-inspect'

export const astLog = () => {
  return () => {
    return (tree: any) => {
      console.log('astLog')
      console.dir(tree, { depth: null })
    }
  }
}

export const astInspect = () => () => (tree: any) => {
  console.log('inspecting tree')
  console.log(inspect(tree, { color: true }))
  console.log()
}
