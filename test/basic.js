import { parse } from '../dist/index.js'
import fs from 'fs'
import path from 'path'
import { parse as svparse } from 'svelte/compiler'

console.log('running basic test')

let name = 'html and codeblocks.md'

let f
try {
  f = fs.readFileSync(path.resolve(name), 'utf-8')
} catch (e) {
  try {
    f = fs.readFileSync(path.resolve('test/' + name), 'utf-8')
  } catch (e) {}
}

let res = await parse(f)
console.log('preprocess succeeded')
console.log(res.code)
console.log()

try {
  svparse(res.code)
  console.log('Svelte render succeeded')
} catch (e) {
  // console.log(e)
  console.log(`Svelte render error at ${e.position[0]}:`)
  console.log(e.frame)
}

// console.log('result:')
// console.log(res.code)
