import { parse } from '../dist/index.mjs'
import fs from 'fs'
import path from 'path'

console.log('running basic test')

let f = fs.readFileSync(path.resolve('test/html.md'), 'utf-8')

let res = await parse(f)
// console.log('result:')
// console.log(res.code)
