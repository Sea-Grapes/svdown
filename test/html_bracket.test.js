import { expect, test } from 'bun:test'
import { findHtmlEnd } from '../src/matchers'

// Basic tag tests
test('simple self-closing tag', () => {
  expect(findHtmlEnd('<Input />', 0)).toBe(8)
})

test('simple opening tag', () => {
  expect(findHtmlEnd('<div>', 0)).toBe(4)
})

test('tag with attributes', () => {
  expect(findHtmlEnd('<div class="foo" id="bar">', 0)).toBe(25)
})

test('tag with single-quoted attributes', () => {
  expect(findHtmlEnd("<div class='foo'>", 0)).toBe(16)
})

// Expression tests
test('tag with expression attribute', () => {
  expect(findHtmlEnd('<div class={active}>', 0)).toBe(19)
})

test('tag with expression inside string', () => {
  expect(findHtmlEnd('<div class="base {active}">', 0)).toBe(26)
})

test('tag with nested expression', () => {
  expect(findHtmlEnd('<div class={obj.prop}>', 0)).toBe(21)
})

test('tag with complex expression', () => {
  expect(findHtmlEnd('<div class={active ? "on" : "off"}>', 0)).toBe(34)
})

test('expression with nested braces', () => {
  expect(findHtmlEnd('<div class={obj.method({ key: "value" })}>', 0)).toBe(41)
})

// Svelte-specific tests
test('svelte component', () => {
  expect(findHtmlEnd('<T.Button variant="primary">', 0)).toBe(27)
})

test('svelte special element', () => {
  expect(findHtmlEnd('<svelte:element this={tag}>', 0)).toBe(26)
})

// Edge cases
test('attribute with escaped quote', () => {
  expect(findHtmlEnd('<div title="She said \\"hello\\"">', 0)).toBe(31)
})

test('multiple attributes with expressions', () => {
  expect(findHtmlEnd('<div class={foo} data-value={bar} id="test">', 0)).toBe(
    43
  )
})

test('tag with newlines', () => {
  const html = `<div
      class="foo"
      id="bar"
    >`
  expect(findHtmlEnd(html, 0)).toBe(html.length - 1)
})

test('mixed quotes and expressions', () => {
  expect(
    findHtmlEnd(
      '<Button class="btn {size}" onclick={handleClick} disabled={isDisabled}>',
      0
    )
  ).toBe(70)
})

test('empty attributes', () => {
  expect(findHtmlEnd('<input disabled required>', 0)).toBe(24)
})

// Error cases
test('returns -1 for unclosed tag', () => {
  expect(findHtmlEnd('<div class="foo', 0)).toBe(-1)
})

test('returns -1 for unclosed expression', () => {
  expect(findHtmlEnd('<div class={foo', 0)).toBe(-1)
})
