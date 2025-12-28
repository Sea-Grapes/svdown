# Svelte Markdown Test File

This is a comprehensive test of mixed Svelte and Markdown syntax!

## Basic Markdown with Svelte Expressions

Here's some text with a {variable} and more text with {count + 1} expressions.

**Bold text with {boldVar}** and *italic with {italicVar}*.

## Svelte Logic Blocks

{#if showContent}
  This content is conditionally rendered!
{/if}

{#if user}
  Welcome back, {user.name}!
{:else}
  Please log in.
{/if}

## Lists with Svelte

- Item one with {item1}
- Item two with {item2}
- {#each items as item}
  - {item.name}
  {/each}

### Numbered list

1. First {value1}
2. Second {value2}
3. {#each numbers as num}
   {num}. Dynamic item
   {/each}

## Code Blocks

Here's some inline `code with {variable}` in it.

```javascript
// This should NOT be processed
const value = {someVar}
function test() {
  return {result}
}
```

## Svelte Each Blocks

{#each todos as todo}
### {todo.title}

{todo.description}

- Priority: {todo.priority}
- Due: {todo.dueDate}
{/each}

## Svelte Await Blocks

{#await promise}
  Loading...
{:then value}
  The value is {value}
{:catch error}
  Error: {error.message}
{/await}

## Links and Images

[Link with {linkText}](https://example.com/{dynamicPath})

![Alt text {altVar}](/images/{imageName}.png)

## Nested Svelte Logic

{#if condition1}
  {#if condition2}
    Deeply nested content with {nestedVar}
    
    ## A heading inside conditionals
    
    More **markdown {styling}** here.
  {/if}
{/if}

## Key Blocks

{#key resetValue}
  <div>This will re-render when resetValue changes: {resetValue}</div>
{/key}

## Attach Directive (Special Case)

{@attach someComponent}

## HTML with Svelte

<div class="container">
  <h2>HTML heading with {htmlVar}</h2>
  
  {#if showDetails}
    <p>Details: {details}</p>
  {/if}
  
  <button on:click={handleClick}>
    Click me: {buttonText}
  </button>
</div>

## Tables with Svelte

| Name | Value |
|------|-------|
| Item 1 | {value1} |
| Item 2 | {value2} |
| {dynamicName} | {dynamicValue} |

## Blockquotes

> This is a quote with {quoteAuthor}
> 
> {#if showFullQuote}
> And this is the continuation with {moreText}
> {/if}

## Complex Nesting

{#each sections as section}
### {section.title}

{section.intro}

{#if section.items}
  {#each section.items as item, i}
  - **{item.name}**: {item.description}
    
    {#if item.details}
    > {item.details}
    {/if}
  {/each}
{/if}

---
{/each}

## Inline HTML and Svelte

This is <span class="highlight">{highlighted}</span> text with <strong>{important}</strong> content.

{#if showAlert}
<div class="alert">
  ⚠️ {alertMessage}
</div>
{/if}

## Multiple Expressions in One Line

The total is {count} and the average is {total / count} which is {status}.

{#if a > b && c < d}
  Complex condition with {result}
{/if}

## Svelte Slots (Edge Case)

<Component>
  <slot name="header">
    # Default Header {title}
  </slot>
  
  {#if showBody}
    <slot>
      Default content with {content}
    </slot>
  {/if}
</Component>

## Debug and HTML

{@html rawHtml}
{@debug user, count}
{@const doubled = count * 2}

The doubled value is {doubled}.

## Final Complex Example

{#each users as user, index}
---

### User #{index + 1}: {user.name}

**Email**: {user.email}  
**Status**: {user.isActive ? '✅ Active' : '❌ Inactive'}

{#if user.posts && user.posts.length > 0}
#### Recent Posts

{#each user.posts.slice(0, 3) as post}
- [{post.title}](/posts/{post.id}) - {post.date}
  
  {#if post.featured}
  > ⭐ Featured post with {post.views} views
  {/if}
{/each}
{:else}
_No posts yet._
{/if}

{#await fetchUserDetails(user.id)}
  Loading details...
{:then details}
  **Bio**: {details.bio}
{:catch err}
  Failed to load details: {err}
{/await}

{/each}

---

That's all folks! Total expressions: {totalCount}