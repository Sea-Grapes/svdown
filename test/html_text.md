# Html text

this is a test to see what happens when you put a broken html element directly after a text node. are they in the same text node? What causes multiple text nodes, is it only if there's something in between like a bold node or something

test
<div


></div>


# Conclusion:

remark-rehype
- dangerousHtml: do mdast html survive as raw in hast.
- characters: text nodes, should <> be escaped

remark-stringiy
- dangerousHtml: should raw be injected verbratim.
- characters: text nodes, should <>& be escaped


So characters do the same thing (theoretically same chars)
- the only difference is the node type and the tree they use mdast vs hast
  
- the purpose is both remark & rehype plugins may inject dangerous chars and thus there's two phases