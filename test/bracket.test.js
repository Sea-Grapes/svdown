import { expect, test } from 'bun:test'
import { findBracketEnd } from '../src/bracket'

// Basic matching tests
test('simple braces', () => {
  expect(findBracketEnd('{foo}', 0)).toBe(4)
})

test('nested braces', () => {
  expect(findBracketEnd('{foo {bar}}', 0)).toBe(10)
  expect(findBracketEnd('{foo {bar}}', 5)).toBe(9)
})

test('multiple levels of nesting', () => {
  expect(findBracketEnd('{a {b {c}}}', 0)).toBe(10)
})

// Svelte block tests
test('svelte if block (#)', () => {
  expect(findBracketEnd('{#if condition}', 0)).toBe(14)
})

test('svelte each block (#)', () => {
  expect(findBracketEnd('{#each items as item}', 0)).toBe(20)
})

test('svelte else block (:)', () => {
  expect(findBracketEnd('{:else}', 0)).toBe(6)
})

test('svelte closing block (/)', () => {
  expect(findBracketEnd('{/if}', 0)).toBe(4)
})

test('svelte await block (@)', () => {
  expect(findBracketEnd('{@html content}', 0)).toBe(14)
})

test('requires svelte marker', () => {
  expect(findBracketEnd('{foo}', 0)).toBe(-1)
})

// String tests
test('braces in double quoted string', () => {
  expect(findBracketEnd('{foo "{ bar }"}', 0)).toBe(14)
})

test('braces in single quoted string', () => {
  expect(findBracketEnd("{foo '{ bar }'}", 0)).toBe(14)
})

test('escaped quotes in string', () => {
  expect(findBracketEnd('{foo "bar \\" baz"}', 0)).toBe(17)
})

test('template literal', () => {
  expect(findBracketEnd('{foo `bar`}', 0)).toBe(10)
})

test('template literal with expression', () => {
  expect(findBracketEnd('{foo `bar ${baz}`}', 0)).toBe(17)
})

test('nested braces in template literal', () => {
  expect(findBracketEnd('{foo `${a} ${b}`}', 0)).toBe(16)
})

// Comment tests
test('line comment with brace', () => {
  expect(findBracketEnd('{foo // { bar\nbaz}', 0)).toBe(18)
})

test('block comment with brace', () => {
  expect(findBracketEnd('{foo /* { bar */ baz}', 0)).toBe(20)
})

test('multiple line comments', () => {
  expect(findBracketEnd('{foo // {\n// }\nbar}', 0)).toBe(18)
})

// Regex tests
test('regex with forward slash', () => {
  expect(findBracketEnd('{foo /test/ bar}', 0)).toBe(15)
})

test('regex with escaped slash', () => {
  expect(findBracketEnd('{foo /te\\/st/ bar}', 0)).toBe(17)
})

test('regex with brace', () => {
  expect(findBracketEnd('{foo /{2,3}/ bar}', 0)).toBe(16)
})

// Complex cases
test('mixed strings and comments', () => {
  const template = '{foo "bar" /* comment */ baz}'
  expect(findBracketEnd(template, 0)).toBe(28)
})

test('svelte block with nested expression', () => {
  const template = '{#if obj.prop && check({ foo: bar })}'
  expect(findBracketEnd(template, 0)).toBe(37)
})

test('deeply nested with strings and comments', () => {
  const template = '{a {b "c {d}" /* e { f } */ {g}}}'
  expect(findBracketEnd(template, 0)).toBe(32)
})

test('svelte block with string containing braces', () => {
  const template = '{#if name === "{test}"}'
  expect(findBracketEnd(template, 0)).toBe(22)
})

test('svelte block with template literal', () => {
  const template = '{#if `${x}` === y}'
  expect(findBracketEnd(template, 0)).toBe(17)
})

// Error cases
test('unclosed brace returns -1', () => {
  expect(findBracketEnd('{foo', 0)).toBe(-1)
})

test('unclosed string returns -1', () => {
  expect(findBracketEnd('{foo "bar}', 0)).toBe(-1)
})

test('invalid starting character', () => {
  expect(findBracketEnd('foo}', 0)).toBe(-1)
})

test('unclosed comment returns -1', () => {
  expect(findBracketEnd('{foo /* bar }', 0)).toBe(-1)
})
