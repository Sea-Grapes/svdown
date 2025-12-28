{items.filter((x) => {

return x.id > 0
})}

{items

> 5}

{#each tests as test}{#if test}

- {test}
{/if}{/each}

In this short example, we show how \textbf{bold text}, \emph{italic text}, and inline math such as $a^2 + b^2 = c^2$ can appear in the same paragraph, along with a displayed equation
\[
\sum\_{i=1}^{n} i = \frac{n(n+1)}{2},
\]
which is commonly used in mathematics.

\end{document}

```js
bracket_pairs.reverse().forEach((pair) => {
  pair.text = content.slice(pair.start, pair.end)
  content = content.slice(0, pair.start) + 'svmd0' + content.slice(pair.end)
})
```
