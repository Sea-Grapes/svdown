import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/index.ts', './src/data.ts'],
  dts: true,
  sourcemap: true,
})
