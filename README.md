# Svdown

A modern markdown preprocessor for Svelte (WIP). Focused on providing extremely easy markdown usage with minimal config needed.

## Installing

_Note: package not published yet._

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