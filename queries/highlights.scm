; Keywords
[
  "fn"
  "record"
  "union"
  "const"
  "static"
  "use"
  "mod"
  "trait"
  "instance"
  "for"
  "in"
  "if"
  "else"
  "while"
  "loop"
  "match"
  "case"
  "let"
  "mut"
  "return"
  "throw"
  "throws"
  "panic"
  "assert"
  "break"
  "continue"
  "try"
  "catch"
  "as"
] @keyword

[
  "and"
  "or"
  "not"
] @keyword.operator

; Visibility / extern
[
  "pub"
  "extern"
] @keyword.modifier

; Attributes
(attribute) @attribute

; Literals
(string_literal) @string

(char_literal) @character

(number_literal) @number

(boolean_literal) @boolean

(nil_literal) @constant.builtin

(undefined_literal) @constant.builtin

; Comments
(line_comment) @comment

(doc_comment) @comment.documentation

; Types
; By default, we might not have a separate type node for primitives,
; but we can match common ones.
((identifier) @type.builtin
  (#match? @type.builtin "^(u8|u16|u32|u64|i8|i16|i32|i64|f32|f64|isize|usize|bool|void)$"))

; Type declarations
(record_declaration
  name: (identifier) @type)

(union_declaration
  name: (identifier) @type)

(trait_declaration
  name: (identifier) @type)

; Usage in types
(pointer_type
  type: (identifier) @type)

(array_type
  type: (identifier) @type)

(optional_type
  type: (identifier) @type)

(parameter
  type: (identifier) @type)

(record_field_declaration
  type: (identifier) @type)

(union_variant
  type: (identifier) @type)

(const_declaration
  type: (identifier) @type)

(static_declaration
  type: (identifier) @type)

(function_declaration
  return_type: (identifier) @type)

(function_declaration
  throws: (identifier) @type)

(function_signature
  return_type: (identifier) @type)

(function_signature
  throws: (identifier) @type)

(instance_declaration
  trait: (identifier) @type
  type: (identifier) @type)

(let_statement
  type: (identifier) @type)

(cast_expression
  type: (identifier) @type)

; Scoped types
(pointer_type
  type: (scoped_identifier
    name: (identifier) @type))

(array_type
  type: (scoped_identifier
    name: (identifier) @type))

(optional_type
  type: (scoped_identifier
    name: (identifier) @type))

(parameter
  type: (scoped_identifier
    name: (identifier) @type))

(record_field_declaration
  type: (scoped_identifier
    name: (identifier) @type))

(const_declaration
  type: (scoped_identifier
    name: (identifier) @type))

(static_declaration
  type: (scoped_identifier
    name: (identifier) @type))

(function_declaration
  return_type: (scoped_identifier
    name: (identifier) @type))

(function_signature
  return_type: (scoped_identifier
    name: (identifier) @type))

(let_statement
  type: (scoped_identifier
    name: (identifier) @type))

(cast_expression
  type: (scoped_identifier
    name: (identifier) @type))

; Assume capitalized identifiers in paths are types or variants
((scoped_identifier
  path: (identifier) @type)
  (#match? @type "^[A-Z]"))

((scoped_identifier
  name: (identifier) @type)
  (#match? @type "^[A-Z]"))

; Functions
(function_declaration
  name: (identifier) @function)

(function_signature
  name: (identifier) @function)

(call_expression
  function: (identifier) @function.call)

(call_expression
  function: (scoped_identifier
    name: (identifier) @function.call))

(call_expression
  function: (field_expression
    field: (identifier) @function.method.call))

; Macros
(macro_invocation
  macro: (at_identifier) @function.macro)

; Fields
(field_expression
  field: (identifier) @property)

(record_field_declaration
  name: (identifier) @property)

(field_initializer
  name: (identifier) @property)

(field_pattern
  name: (identifier) @property)

; Constants / Variants
(union_variant
  name: (identifier) @constant)

(const_declaration
  name: (identifier) @constant)

(static_declaration
  name: (identifier) @constant)

((identifier) @constant
  (#match? @constant "^[A-Z][A-Z\\d_]*$"))

; Variables
(parameter
  name: (identifier) @variable.parameter)

(identifier) @variable

; Punctuation
[
  "("
  ")"
  "["
  "]"
  "{"
  "}"
] @punctuation.bracket

[
  ","
  "."
  ";"
  "::"
  ":"
] @punctuation.delimiter

; Operators
[
  "*"
  "/"
  "%"
  "+"
  "-"
  "<<"
  ">>"
  "&"
  "^"
  "|"
  "=="
  "!="
  "<"
  "<="
  ">"
  ">="
  "="
  "+="
  "-="
  "*="
  "/="
  "%="
  "&="
  "|="
  "^="
  "<<="
  ">>="
  "!"
  "~"
  "?"
  ".."
  "=>"
  "->"
] @operator
