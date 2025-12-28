import { parse } from '../dist/index.js'
import fs from 'fs'
import path from 'path'
import { parse as svparse } from 'svelte/compiler'

console.log('running basic test')

let name = 'html.md'

let f
try {
  f = fs.readFileSync(path.resolve(name), 'utf-8')
} catch (e) {
  try {
    f = fs.readFileSync(path.resolve('test/' + name), 'utf-8')
  } catch (e) {}
}

let res = await parse(f)

try {
  svparse(res.code)
  console.log('parse succeeded')
} catch (e) {
  console.log(e)
}

// console.log('result:')
// console.log(res.code)
