import { parse } from '../dist/index.js'
import fs from 'fs'
import path from 'path'

console.log('running basic test')

let name = 'attach.md'

let f
try {
  f = fs.readFileSync(path.resolve(name), 'utf-8')
} catch (e) {
  try {
    f = fs.readFileSync(path.resolve('test/' + name), 'utf-8')
  } catch (e) {}
}

let res = await parse(f)
// console.log('result:')
// console.log(res.code)
