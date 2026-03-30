# Agent Skill: Tree-sitter Grammar Development

This skill codifies the best practices and lessons learned for developing, testing, and refining custom Tree-sitter grammars for programming languages.

## 1. Core Workflow
1. **Understand the Target Syntax**: Analyze language specifications, compiler parsing logic (e.g., AST nodes, Tokenizer), and test suites before writing rules.
2. **Scaffold the Grammar**: Define `extras` (whitespace, comments), the top-level `source_file` rule, and separate structural groups (`_declaration`, `_statement`, `_expression`, `_type`).
3. **Iterative Generation**: Run `tree-sitter generate` frequently to catch conflicts early.
4. **Bulk Corpus Testing**: Rather than relying only on small tests, clone a real repository or test suite of the language and run `find src -name "*.ext" -print0 | xargs -0 tree-sitter parse -q`. Identify and fix the syntax errors iteratively.

## 2. Grammar Design Patterns

### Statement vs. Expression Boundaries
Languages differ on whether control flow structures (like `if`, `match`, `while`, or blocks `{}`) are expressions or statements.
- **Strict Distinction**: If `if` and `match` are strict statements (like in Radiance), do *not* include them in the `_expression` choice to avoid massive shift-reduce conflicts with expression-terminators like semicolons.
- If a construct like a struct/record literal `{ ... }` can be confused with a block statement `{ ... }`, heavily restrict the `name` field of the struct to identifiers and use `conflicts` if an LR(1) ambiguity is unavoidable.

### Precedence and Associativity
Use a `PREC` object map to enforce precedence logically:
```javascript
const PREC = { call: 14, field: 13, unary: 11, additive: 8, assign: 0 };
```
- Wrap rules using `prec(PREC.call, ...)` or `prec.left(PREC.additive, ...)`.
- **Right Associativity**: Use `prec.right` for assignments (`x = y = z`) and cascading conditional operations (like Pythonic `x if y else z` or `try` expressions with trailing optional catch clauses).

### Resolving Conflicts
Tree-sitter uses an LR(1) parser generator. Sometimes, 1 token of lookahead isn't enough (e.g., deciding if `Foo` is a type or a variable).
- **First Resort**: Add precedence levels or associativity to operators.
- **Second Resort**: Use the `conflicts: $ => [ ... ]` array explicitly. Example: `[$._type, $._pattern]`.
- Note: Try to minimize unnecessary conflicts. `tree-sitter generate` will print a warning if a conflict array is listed but no longer needed. Remove stale conflicts to keep the grammar robust.

## 3. Query Configuration (Syntax Highlighting & Tags)

### Configuration Setup (`tree-sitter.json`)
Ensure the grammar metadata properly defines the extensions, scope, and paths to queries.
```json
{
  "grammars": [{
    "name": "language_name",
    "scope": "source.ext",
    "file-types": ["ext"],
    "highlights": ["queries/highlights.scm"],
    "tags": ["queries/tags.scm"]
  }]
}
```

### Highlights (`highlights.scm`)
Map grammar nodes to standard Neovim / Helix / Zed capture names:
- `@keyword.control`, `@keyword.operator`, `@keyword.modifier`.
- Identify primitive types explicitly via `#match?`:
  `((identifier) @type.builtin (#match? @type.builtin "^(u8|i32|bool|void)$"))`
- Capitalized conventions:
  `((identifier) @type (#match? @type "^[A-Z]"))`
- Distinguish between standard functions (`@function.call`), method calls (`@function.method.call`), and macros (`@function.macro`).

### Code Navigation (`tags.scm`)
Map definition points for IDE integration:
- `(function_declaration name: (identifier) @name) @definition.function`
- `(record_declaration name: (identifier) @name) @definition.class`
- `(call_expression function: (identifier) @name) @reference.call`

## 4. Automation & Tooling
A `Makefile` is essential for validating the grammar against a real project.
Example target for full-corpus validation:
```makefile
test-corpus: generate
	@if [ ! -d "vendor/project" ]; then git clone <repo_url> vendor/project; fi
	find vendor/project -name "*.ext" -print0 | xargs -0 tree-sitter parse -q
```
