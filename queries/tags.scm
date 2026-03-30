(function_declaration
  name: (identifier) @name) @definition.function

(function_signature
  name: (identifier) @name) @definition.function

(record_declaration
  name: (identifier) @name) @definition.class

(union_declaration
  name: (identifier) @name) @definition.class

(trait_declaration
  name: (identifier) @name) @definition.interface

(instance_declaration
  trait: (identifier) @name) @definition.implementation

(const_declaration
  name: (identifier) @name) @definition.constant

(static_declaration
  name: (identifier) @name) @definition.constant

(mod_declaration
  name: (identifier) @name) @definition.module

(call_expression
  function: (identifier) @name) @reference.call

(call_expression
  function: (scoped_identifier
    name: (identifier) @name)) @reference.call

(call_expression
  function: (field_expression
    field: (identifier) @name)) @reference.call

(record_field_declaration
  name: (identifier) @name) @definition.field

(union_variant
  name: (identifier) @name) @definition.field

(macro_invocation
  macro: (at_identifier) @name) @reference.call
