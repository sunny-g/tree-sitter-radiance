; -----------------------------------------------------------------------------
; Tree-sitter Queries: Tags (Code Navigation / Symbols)
; -----------------------------------------------------------------------------
; Tag queries are used for code navigation, outline views, and "Go to Definition"
; features (like generating ctags or powering LSP-like outline features in editors).
;
; The general pattern is:
; 1. Match the entire declaration node and assign it a standard type like
;    `@definition.function` or `@definition.class`.
; 2. Match the specific identifier that names the declaration and assign it `@name`.

; Functions
; Example: `fn keywordOrIdent(...)`
; Entire `function_declaration` becomes `@definition.function`,
; `keywordOrIdent` becomes `@name`.
(function_declaration
  name: (identifier) @name) @definition.function

(function_signature
  name: (identifier) @name) @definition.function

; Classes / Structs
; In Radiance, records and unions are roughly analogous to classes.
(record_declaration
  name: (identifier) @name) @definition.class

(union_declaration
  name: (identifier) @name) @definition.class

; Interfaces / Traits
(trait_declaration
  name: (identifier) @name) @definition.interface

(instance_declaration
  trait: (identifier) @name) @definition.implementation

; Constants
(const_declaration
  name: (identifier) @name) @definition.constant

(static_declaration
  name: (identifier) @name) @definition.constant

; Modules
(mod_declaration
  name: (identifier) @name) @definition.module

; References (Calls)
; We can also track where things are used (`@reference.call`).
(call_expression
  function: (identifier) @name) @reference.call

(call_expression
  function: (scoped_identifier
    name: (identifier) @name)) @reference.call

(call_expression
  function: (field_expression
    field: (identifier) @name)) @reference.call

; Fields
(record_field_declaration
  name: (identifier) @name) @definition.field

(union_variant
  name: (identifier) @name) @definition.field

; Macros
(macro_invocation
  macro: (at_identifier) @name) @reference.call
