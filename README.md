# Svdown

A modern markdown preprocessor for Svelte (WIP). Focused on providing extremely easy markdown usage with minimal config needed.

Inspired by [MDsveX](https://github.com/pngwn/MDsveX)!

## Installing

_Note: package still in active development._

```bash
pnpm i -D svdown
```

Add it to your `svelte.config.js`:

```js
import { markdown } from 'svdown'

/** @type {import('@sveltejs/kit').Config} */
const config = {
  extensions: ['.svelte', '.md'],
  preprocess: [vitePreprocess(), markdown()],
}
```