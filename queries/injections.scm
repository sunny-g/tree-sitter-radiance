; -----------------------------------------------------------------------------
; Tree-sitter Queries: Injections
; -----------------------------------------------------------------------------
; Injections allow you to embed one language inside another!
; A classic example is embedding Markdown parsing inside doc comments.
;
; By doing this, your editor can apply full Markdown syntax highlighting
; (bold, italics, links) and even nested injections (like fenced code blocks
; containing Radiance code inside a Markdown comment!)
;
; Example Radiance code:
;   /// This is a doc comment.
;   /// It supports **Markdown**!
;
; - `@injection.content` captures the actual text that should be handed off.
; - `#set! injection.language "markdown"` hardcodes the target language parser to use.

((doc_comment) @injection.content
 (#set! injection.language "markdown"))
