# Svdown

A modern markdown preprocessor for Svelte (WIP). Focused on providing extremely easy markdown usage with minimal config needed.

Feature Goals:
- comprehensive content-authoring experience for blogging, docs, etc.
- tightly integrated markdown and Svelte
- support for any (hopefully) remark/rehype plugins (including Latex)
- image processing (enhanced-img, relative urls)
- headings, table of contents, custom components
- built-in code highlighters

Experimental
- route or file-based layouts, state-based layouts/fm, fm process func

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