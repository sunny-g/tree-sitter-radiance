# Agent Skill: Tree-sitter Grammar Development

This skill codifies best practices, design patterns, and lessons learned for developing, testing, and refining custom Tree-sitter grammars and queries.

## 1. Core Workflow & Iterative Testing

Writing a grammar is highly iterative. Rather than relying solely on small, artificial test cases, use a real corpus of code.

1. **Scaffold the Grammar**: Define `extras` (whitespace, comments), `word`, and top-level structural groups (`_statement`, `_expression`, `_type`).
2. **Generate**: Run `tree-sitter generate` frequently to catch syntax errors or conflicts early.
3. **Bulk Corpus Testing**: Test against real codebases iteratively.
   - Example command: `find path/to/repo -name "*.ext" -exec tree-sitter parse {} + | grep ERROR`
   - Investigate errors: Use `tree-sitter parse path/to/file.ext` combined with `grep -A 20 -B 20 ERROR` to see the AST context surrounding the failure.
   - Look at the actual source code (e.g. using `sed -n 'X,Yp'`) around the failure line to understand why the parser got stuck.

## 2. Grammar Design Patterns (`grammar.js`)

Tree-sitter grammars are defined using a JavaScript DSL. Leverage JS features to keep the grammar DRY and readable.

### 2.1. Helpers & DRY Code
Use standard JavaScript functions to generate repeating rules (like comma-separated lists with optional trailing commas).
```javascript
function commaSep(rule) {
  return optional(commaSep1(rule));
}
function commaSep1(rule) {
  // Matches: rule, optionally followed by `, rule`, optionally ending in a `,`.
  return seq(rule, repeat(seq(',', rule)), optional(','));
}
```

### 2.2. Precedence and Associativity (`PREC`)
Use a `PREC` object map to resolve ambiguities in expressions without relying on GLR forks.
```javascript
const PREC = { call: 14, field: 13, unary: 11, multiplicative: 9, additive: 8, assign: 0 };
```
- Wrap rules using `prec(PREC.call, ...)` or `prec.left(PREC.additive, ...)`.
- **Right Associativity**: Use `prec.right` for assignments (`x = y = z` parses as `x = (y = z)`) and cascading conditionals (like `try/catch` blocks or `if/else` expressions).

### 2.3. Hidden Rules vs. Named Rules
Prefixing a rule with an underscore (e.g., `_statement`, `_expression`) hides it from the final Abstract Syntax Tree (AST). This keeps the AST clean while still allowing you to group choices logically.

### 2.4. Extras & Word
- **`extras`**: Defines tokens that can appear anywhere (between any other tokens). Always include whitespace and comments.
  ```javascript
  extras: $ => [ /\s/, $.line_comment, $.doc_comment ],
  ```
- **`word`**: Helps the lexer distinguish keywords from identifiers.
  ```javascript
  word: $ => $.identifier,
  ```

### 2.5. Field Names
Use `field('name', ...)` to tag important child nodes. This is absolutely critical for querying the AST later for syntax highlighting or code navigation.
```javascript
function_declaration: $ => seq(
  'fn',
  field('name', $.identifier),
  field('parameters', $.parameter_list),
  field('body', $.block)
)
```

### 2.6. Resolving GLR Conflicts
Tree-sitter uses an LR(1) parser. If 1 token of lookahead isn't enough, you must explicitly declare expected ambiguities in the `conflicts` array to suppress build errors and tell the parser to fork and explore multiple branches concurrently.
- Only add conflicts when necessary (e.g., `[$._expression, $.struct_expression]`).
- Clean up the `conflicts` array! `tree-sitter generate` will emit warnings for unnecessary conflicts. Removing them speeds up the parser and keeps the grammar robust.

## 3. Query Configuration (`queries/*.scm`)

Queries map the parsed AST to editor features like syntax highlighting, code folding, and "Go to Definition" functionality.

### 3.1. Syntax Highlighting (`highlights.scm`)
Matches are captured using the `@` symbol and map to standard themes (e.g., `@keyword`, `@type`, `@function`, `@variable`).

- **Literal Matching**: Match exact string tokens.
  ```scheme
  [ "fn" "let" "if" "else" ] @keyword
  [ "==" "!=" ] @operator
  ```
- **Node Matching**: Match specific rules defined in `grammar.js`.
  ```scheme
  (string_literal) @string
  (doc_comment) @comment.documentation
  ```
- **Context-Aware Fields**: Use the fields you defined in the grammar to precisely target identifiers.
  ```scheme
  (function_declaration name: (identifier) @function)
  (record_declaration name: (identifier) @type)
  ```
- **Predicates & Heuristics**: Use `#match?` to filter nodes via regex. Great for primitive types or capitalization conventions.
  ```scheme
  ((identifier) @type.builtin (#match? @type.builtin "^(u8|i32|bool|void)$"))
  ((scoped_identifier path: (identifier) @type) (#match? @type "^[A-Z]"))
  ```

### 3.2. Code Navigation / Symbols (`tags.scm`)
Powers "Go to Definition", workspace symbols, and outline views (like LSP features).
The standard pattern is: tag the parent node with the symbol type (`@definition.class`), and the identifier node with `@name`.
```scheme
(function_declaration
  name: (identifier) @name) @definition.function

(record_declaration
  name: (identifier) @name) @definition.class

(call_expression
  function: (identifier) @name) @reference.call
```

### 3.3. Language Injections (`injections.scm`)
Allows embedding one language parser inside another (e.g., parsing Markdown inside doc comments, or SQL inside strings).
```scheme
((doc_comment) @injection.content
 (#set! injection.language "markdown"))
```
- `@injection.content` captures the text.
- `#set! injection.language` specifies the parser to invoke.

## 4. Common Pitfalls & Troubleshooting
- **Missing Optional Semicolons**: If a construct (like `match` or `if`) can be both an expression and a statement, ensure that its statement form handles trailing semicolons correctly (e.g. `optional(';')`), otherwise it will break when used inside a block.
- **Unary Operators in Patterns**: Ensure unary operators (like `-1` or `!true`) are supported not just in expressions, but in patterns (e.g. inside a `match` case or `let` assignment) if the language supports it.
- **Left vs Right Recursion**: Use `repeat(...)` or `seq(...)` constructs instead of defining left-recursive or right-recursive rules manually, as Tree-sitter handles `repeat` highly efficiently in C.
