import { expect, test } from 'bun:test'
import { findBracket } from '../src/bracket'

// Basic matching tests
test('simple braces', () => {
  expect(findBracket('{foo}', 0)).toBe(4)
})

test('nested braces', () => {
  expect(findBracket('{foo {bar}}', 0)).toBe(10)
  expect(findBracket('{foo {bar}}', 5)).toBe(9)
})

test('multiple levels of nesting', () => {
  expect(findBracket('{a {b {c}}}', 0)).toBe(10)
})

// Svelte block tests
test('svelte if block (#)', () => {
  expect(findBracket('{#if condition}', 0)).toBe(14)
})

test('svelte each block (#)', () => {
  expect(findBracket('{#each items as item}', 0)).toBe(20)
})

test('svelte else block (:)', () => {
  expect(findBracket('{:else}', 0)).toBe(6)
})

test('svelte closing block (/)', () => {
  expect(findBracket('{/if}', 0)).toBe(4)
})

test('svelte await block (@)', () => {
  expect(findBracket('{@html content}', 0)).toBe(14)
})

test('requires svelte marker', () => {
  expect(findBracket('{foo}', 0)).toBe(-1)
})

// String tests
test('braces in double quoted string', () => {
  expect(findBracket('{foo "{ bar }"}', 0)).toBe(14)
})

test('braces in single quoted string', () => {
  expect(findBracket("{foo '{ bar }'}", 0)).toBe(14)
})

test('escaped quotes in string', () => {
  expect(findBracket('{foo "bar \\" baz"}', 0)).toBe(17)
})

test('template literal', () => {
  expect(findBracket('{foo `bar`}', 0)).toBe(10)
})

test('template literal with expression', () => {
  expect(findBracket('{foo `bar ${baz}`}', 0)).toBe(17)
})

test('nested braces in template literal', () => {
  expect(findBracket('{foo `${a} ${b}`}', 0)).toBe(16)
})

// Comment tests
test('line comment with brace', () => {
  expect(findBracket('{foo // { bar\nbaz}', 0)).toBe(18)
})

test('block comment with brace', () => {
  expect(findBracket('{foo /* { bar */ baz}', 0)).toBe(20)
})

test('multiple line comments', () => {
  expect(findBracket('{foo // {\n// }\nbar}', 0)).toBe(18)
})

// Regex tests
test('regex with forward slash', () => {
  expect(findBracket('{foo /test/ bar}', 0)).toBe(15)
})

test('regex with escaped slash', () => {
  expect(findBracket('{foo /te\\/st/ bar}', 0)).toBe(17)
})

test('regex with brace', () => {
  expect(findBracket('{foo /{2,3}/ bar}', 0)).toBe(16)
})

// Complex cases
test('mixed strings and comments', () => {
  const template = '{foo "bar" /* comment */ baz}'
  expect(findBracket(template, 0)).toBe(28)
})

test('svelte block with nested expression', () => {
  const template = '{#if obj.prop && check({ foo: bar })}'
  expect(findBracket(template, 0)).toBe(37)
})

test('deeply nested with strings and comments', () => {
  const template = '{a {b "c {d}" /* e { f } */ {g}}}'
  expect(findBracket(template, 0)).toBe(32)
})

test('svelte block with string containing braces', () => {
  const template = '{#if name === "{test}"}'
  expect(findBracket(template, 0)).toBe(22)
})

test('svelte block with template literal', () => {
  const template = '{#if `${x}` === y}'
  expect(findBracket(template, 0)).toBe(17)
})

// Error cases
test('unclosed brace returns -1', () => {
  expect(findBracket('{foo', 0)).toBe(-1)
})

test('unclosed string returns -1', () => {
  expect(findBracket('{foo "bar}', 0)).toBe(-1)
})

test('invalid starting character', () => {
  expect(findBracket('foo}', 0)).toBe(-1)
})

test('unclosed comment returns -1', () => {
  expect(findBracket('{foo /* bar }', 0)).toBe(-1)
})
