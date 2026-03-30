/**
 * Tree-sitter Grammar for Radiance
 *
 * This file defines the syntax of the Radiance programming language using a JavaScript DSL.
 * Tree-sitter processes this file to generate a fast, incremental parser in C.
 *
 * Concepts highlighted:
 * 1. Precedence (PREC)
 * 2. JS Helper Functions
 * 3. Extras & Word
 * 4. GLR Conflicts
 * 5. Rules: seq, choice, optional, repeat, field, prec
 * 6. Hidden rules (prefixed with _) vs Named rules
 */

// -------------------------------------------------------------------------
// 1. PRECEDENCE (PREC)
// -------------------------------------------------------------------------
// Tree-sitter uses a precedence table to resolve ambiguities, especially
// in expressions. For example, in `1 + 2 * 3`, `*` has a higher precedence (9)
// than `+` (8), so it parses as `1 + (2 * 3)`.
// Higher numbers = tighter binding.
const PREC = {
  call: 14,
  field: 13,
  try: 12,
  unary: 11,
  cast: 10,
  multiplicative: 9,
  additive: 8,
  shift: 7,
  bitand: 6,
  bitxor: 5,
  bitor: 4,
  comparative: 3,
  and: 2,
  or: 1,
  assign: 0,
};

// -------------------------------------------------------------------------
// 2. HELPER FUNCTIONS
// -------------------------------------------------------------------------
// Because this is just JavaScript, we can write functions to DRY up our grammar.
// Here we define a helper for comma-separated lists, which are very common
// (e.g., function parameters: `fn foo(a: u8, b: u8)`).
function commaSep(rule) {
  return optional(commaSep1(rule));
}

function commaSep1(rule) {
  // Matches: `rule`, optionally followed by `, rule`, optionally ending in a `,`.
  // e.g., `a: u8, b: u8,`
  return seq(rule, repeat(seq(",", rule)), optional(","));
}

module.exports = grammar({
  name: "radiance",

  // -------------------------------------------------------------------------
  // 3. EXTRAS & WORD
  // -------------------------------------------------------------------------
  // `extras` defines tokens that can appear *anywhere* in the code, between
  // any other tokens, without having to explicitly add them to every rule.
  // Standard examples: whitespace, line comments (//), and doc comments (///).
  extras: ($) => [/\s/, $.line_comment, $.doc_comment],

  // `word` tells Tree-sitter how to lex keywords vs identifiers.
  // It ensures that a keyword like `fn` isn't accidentally parsed as an
  // identifier `fn` unless the context explicitly demands it.
  word: ($) => $.identifier,

  // -------------------------------------------------------------------------
  // 4. CONFLICTS
  // -------------------------------------------------------------------------
  // Tree-sitter uses GLR parsing, meaning it can explore multiple parse branches
  // concurrently when the grammar is ambiguous. However, we must explicitly declare
  // expected ambiguities in the `conflicts` array to suppress build warnings.
  //
  // For instance, `[$._expression, $.struct_expression]` resolves cases where the parser
  // sees `{` and doesn't know if it's a block starting or a struct instantiation.
  conflicts: ($) => [
    [$._expression, $.struct_expression],
    [$.expression_statement],
    [$._statement, $.let_statement],
    [$.return_statement, $.cond_expression],
    [$.throw_statement, $.cond_expression],
    [$.panic_statement, $.cond_expression],
    [$.assert_statement, $.cond_expression],
    [$._expression, $.field_initializer],
    [$.block, $.field_initializer_list],
    [$.expression_statement, $.cond_expression],
    [$._type, $._expression],
    [$.return_statement],
    [$.throw_statement],
    [$.panic_statement],
    [$.assert_statement],
    [$.break_statement],
    [$.continue_statement],
    [$.let_statement],
    [$.function_type],
    [$._statement, $.match_arm],
    [$.expression_statement, $.match_arm],
    [$.if_statement],
    [$.match_statement],
    [$.while_statement],
    [$.for_statement],
    [$.opaque_type],
  ],

  // -------------------------------------------------------------------------
  // 5. RULES
  // -------------------------------------------------------------------------
  rules: {
    // The entry point of the grammar. A Radiance file is a list of statements.
    // Example: `use std::mem; fn main() {}`
    source_file: ($) => repeat($._statement),

    // Tokens match regular expressions directly. `token()` indicates this is a single
    // indivisible unit for the lexer.
    line_comment: ($) => token(seq("//", /.*/)),
    doc_comment: ($) => token(seq(choice("///", "//!"), /.*/)),

    // -----------------------------------------------------------------------
    // 6. HIDDEN RULES (prefix `_`)
    // -----------------------------------------------------------------------
    // Rules prefixed with an underscore (like `_statement`) do NOT appear in
    // the final Abstract Syntax Tree (AST). They are used to group other rules
    // together. If you query the AST, you will see `expression_statement` or
    // `if_statement`, but never `_statement`.
    _statement: ($) =>
      choice(
        $.expression_statement,
        $._declaration_statement,
        $.if_statement,
        $.while_statement,
        $.for_statement,
        $.loop_statement,
        $.match_statement,
        $.return_statement,
        $.throw_statement,
        $.panic_statement,
        $.assert_statement,
        $.break_statement,
        $.continue_statement,
        $.block,
      ),

    _declaration_statement: ($) =>
      choice(
        $.function_declaration,
        $.record_declaration,
        $.union_declaration,
        $.const_declaration,
        $.static_declaration,
        $.use_declaration,
        $.mod_declaration,
        $.trait_declaration,
        $.instance_declaration,
        $.let_statement,
      ),

    // Attributes
    // Example: `@test mod tests;` -> `attribute` is `@test`
    attributes: ($) => repeat1($.attribute),
    attribute: ($) =>
      choice("@default", "@test", "@intrinsic", "pub", "extern"),

    // -----------------------------------------------------------------------
    // FIELDS & SEQUENCES
    // -----------------------------------------------------------------------
    // `seq` matches rules in exact order.
    // `field('name', ...)` assigns a name to a child node. This is vital for
    // syntax highlighting and querying.
    // Example Radiance code: `fn keywordOrIdent(src: *[u8]) -> TokenKind { ... }`
    //   - `name`: keywordOrIdent
    //   - `parameters`: (src: *[u8])
    //   - `return_type`: TokenKind
    //   - `body`: { ... }
    function_declaration: ($) =>
      seq(
        optional($.attributes),
        "fn",
        optional(
          seq(
            "(",
            field("receiver_name", $.identifier),
            ":",
            field("receiver_type", $._type),
            ")",
          ),
        ),
        field("name", $.identifier),
        field("parameters", $.parameter_list),
        optional(seq("->", field("return_type", $._type))),
        optional(seq("throws", "(", commaSep(field("throws", $._type)), ")")),
        field("body", choice($.block, ";")),
      ),

    parameter_list: ($) => seq("(", commaSep($.parameter), ")"),
    parameter: ($) =>
      seq(field("name", $.identifier), ":", field("type", $._type)),

    // Example: `pub record TokenKind { Eof, Invalid }`
    record_declaration: ($) =>
      seq(
        optional($.attributes),
        "record",
        field("name", $.identifier),
        field(
          "body",
          choice(
            $.record_field_declaration_list,
            seq("(", commaSep($._type), ")", ";"),
          ),
        ),
      ),

    record_field_declaration_list: ($) =>
      seq("{", commaSep($.record_field_declaration), "}"),
    record_field_declaration: ($) =>
      seq(field("name", $.identifier), ":", field("type", $._type)),

    union_declaration: ($) =>
      seq(
        optional($.attributes),
        "union",
        field("name", $.identifier),
        field("body", $.union_variant_list),
      ),

    union_variant_list: ($) => seq("{", commaSep($.union_variant), "}"),
    union_variant: ($) =>
      seq(
        field("name", $.identifier),
        optional(
          choice(
            seq("(", field("type", $._type), ")"),
            seq("=", field("value", $._expression)),
            field("fields", $.record_field_declaration_list),
          ),
        ),
      ),

    const_declaration: ($) =>
      seq(
        optional($.attributes),
        "const",
        field("name", $.identifier),
        ":",
        field("type", $._type),
        "=",
        field("value", $._expression),
        ";",
      ),

    static_declaration: ($) =>
      seq(
        optional($.attributes),
        "static",
        field("name", $.identifier),
        ":",
        field("type", $._type),
        "=",
        field("value", $._expression),
        ";",
      ),

    // Example: `use std::lang::strings;`
    use_declaration: ($) =>
      seq(
        optional($.attributes),
        "use",
        field("path", $.scoped_identifier),
        ";",
      ),

    mod_declaration: ($) =>
      seq(optional($.attributes), "mod", field("name", $.identifier), ";"),

    trait_declaration: ($) =>
      seq(
        optional($.attributes),
        "trait",
        field("name", $.identifier),
        optional(seq(":", field("supertraits", $.supertraits))),
        field("body", $.trait_body),
      ),

    supertraits: ($) => seq($._type, repeat(seq("+", $._type))),

    trait_body: ($) => seq("{", repeat($._trait_item), "}"),
    _trait_item: ($) => choice($.function_signature),

    function_signature: ($) =>
      seq(
        "fn",
        optional(seq("(", field("receiver_type", $._type), ")")),
        field("name", $.identifier),
        field("parameters", $.parameter_list),
        optional(seq("->", field("return_type", $._type))),
        optional(seq("throws", "(", commaSep(field("throws", $._type)), ")")),
        ";",
      ),

    instance_declaration: ($) =>
      seq(
        optional($.attributes),
        "instance",
        field("trait", $.identifier),
        "for",
        field("type", $._type),
        field("body", $.instance_body),
      ),

    instance_body: ($) => seq("{", repeat($.function_declaration), "}"),

    // `let` handles multiple Radiance concepts: variable declarations and pattern matching.
    // Examples:
    // - `let mut left: u32 = 0;`
    // - `let case -1 = cmp;`
    let_statement: ($) =>
      seq(
        "let",
        optional("case"),
        optional("mut"),
        field("pattern", $._pattern),
        optional(seq(":", field("type", $._type))),
        optional(seq("align", "(", field("align", $._expression), ")")),
        optional(seq("=", field("value", $._expression))),
        optional(seq(choice(";", "if"), field("guard", $._expression))),
        optional(
          seq("else", field("else_branch", choice($.block, $._statement))),
        ),
        ";",
      ),

    // Statements
    expression_statement: ($) => seq($._expression, optional(";")),

    if_statement: ($) =>
      seq(
        "if",
        field("condition", choice($.let_condition, $._expression)),
        field("consequence", $.block),
        optional(
          seq("else", field("alternative", choice($.block, $.if_statement))),
        ),
        optional(";"),
      ),

    let_condition: ($) =>
      seq(
        "let",
        optional("case"),
        optional("mut"),
        field("pattern", $._pattern),
        "=",
        field("value", $._expression),
        optional(seq(choice(";", "if"), field("guard", $._expression))),
      ),

    while_statement: ($) =>
      seq(
        "while",
        field("condition", choice($.let_condition, $._expression)),
        field("body", $.block),
        optional(seq("else", field("alternative", $.block))),
      ),

    for_statement: ($) =>
      seq(
        "for",
        field("pattern", $._pattern),
        optional(seq(",", field("index", $._pattern))),
        "in",
        field("value", choice($._expression, $.range_expression)),
        field("body", $.block),
        optional(seq("else", field("alternative", $.block))),
      ),

    loop_statement: ($) => seq("loop", field("body", choice($.block, ";"))),

    // `match` works as both a statement and an expression.
    // Example:
    // match cmp {
    //     case -1 => right = mid,
    //     else => return kw.tok,
    // }
    match_statement: ($) =>
      seq(
        "match",
        field("value", $._expression),
        field("body", $.match_block),
        optional(";"),
      ),

    match_block: ($) => seq("{", repeat($.match_arm), "}"),
    match_arm: ($) =>
      seq(
        choice(
          seq("case", commaSep(field("pattern", $._pattern))),
          "else",
          field("pattern", $._pattern),
        ),
        optional(seq("if", field("guard", $._expression))),
        "=>",
        field("body", choice($._expression, $.block, $._statement)),
        optional(","),
      ),

    return_statement: ($) =>
      seq("return", optional($._expression), optional(";")),
    throw_statement: ($) => seq("throw", $._expression, optional(";")),
    panic_statement: ($) =>
      seq("panic", optional($._expression), optional(";")),
    assert_statement: ($) =>
      seq(
        "assert",
        choice($._expression, $.block),
        optional(seq(",", $._expression)),
        optional(";"),
      ),
    break_statement: ($) => seq("break", optional(";")),
    continue_statement: ($) => seq("continue", optional(";")),

    block: ($) => seq("{", repeat($._statement), "}"),

    // Expressions
    _expression: ($) =>
      choice(
        $.identifier,
        $.number_literal,
        $.string_literal,
        $.char_literal,
        $.boolean_literal,
        $.nil_literal,
        $.undefined_literal,
        $.array_expression,
        $.binary_expression,
        $.unary_expression,
        $.call_expression,
        $.field_expression,
        $.subscript_expression,
        $.cast_expression,
        $.parenthesized_expression,
        $.macro_invocation,
        $.try_expression,
        $.address_expression,
        $.deref_expression,
        $.struct_expression,
        $.scoped_identifier,
        $.cond_expression,
      ),

    // -----------------------------------------------------------------------
    // ASSOCIATIVITY (prec.left / prec.right)
    // -----------------------------------------------------------------------
    // Assignment evaluates right-to-left: `a = b = c` becomes `a = (b = c)`.
    // So we use `prec.right(PREC.assign, ...)` to bind correctly.
    cond_expression: ($) =>
      prec.right(
        PREC.assign,
        seq(
          field("consequence", $._expression),
          "if",
          field("condition", $._expression),
          "else",
          field("alternative", $._expression),
        ),
      ),

    binary_expression: ($) => {
      const ops = [
        ["*", PREC.multiplicative],
        ["/", PREC.multiplicative],
        ["%", PREC.multiplicative],
        ["+", PREC.additive],
        ["-", PREC.additive],
        ["<<", PREC.shift],
        [">>", PREC.shift],
        ["&", PREC.bitand],
        ["^", PREC.bitxor],
        ["|", PREC.bitor],
        ["==", PREC.comparative],
        ["!=", PREC.comparative],
        ["<", PREC.comparative],
        ["<=", PREC.comparative],
        [">", PREC.comparative],
        [">=", PREC.comparative],
        ["and", PREC.and],
        ["or", PREC.or],
      ];

      return choice(
        // Map normal operators to left-associativity `prec.left`: `1 + 2 + 3` -> `(1 + 2) + 3`
        ...ops.map(([operator, precedence]) =>
          prec.left(
            precedence,
            seq(
              field("left", $._expression),
              field("operator", operator),
              field("right", $._expression),
            ),
          ),
        ),
        // Map assignment operators to right-associativity `prec.right`
        ...[
          "=",
          "+=",
          "-=",
          "*=",
          "/=",
          "%=",
          "&=",
          "|=",
          "^=",
          "<<=",
          ">>=",
        ].map((operator) =>
          prec.right(
            PREC.assign,
            seq(
              field("left", $._expression),
              field("operator", operator),
              field("right", $._expression),
            ),
          ),
        ),
      );
    },

    // Unary operators generally bind tighter than binary ops, except cast.
    // Example: `-1`, `!true`
    unary_expression: ($) =>
      prec(
        PREC.unary,
        seq(choice("-", "!", "~", "not"), field("operand", $._expression)),
      ),

    try_expression: ($) =>
      prec.right(
        PREC.try,
        seq(
          "try",
          optional(choice("!", "?")),
          field("operand", $._expression),
          optional(seq(repeat1($.catch_clause))),
        ),
      ),

    catch_clause: ($) =>
      seq(
        "catch",
        optional(
          seq(
            field("binding", $.identifier),
            optional(seq("as", field("type", $._type))),
          ),
        ),
        field("body", choice($.block, ";")),
      ),

    address_expression: ($) =>
      prec(
        PREC.unary,
        seq("&", optional("mut"), field("operand", $._expression)),
      ),

    deref_expression: ($) =>
      prec(PREC.unary, seq("*", field("operand", $._expression))),

    cast_expression: ($) =>
      prec.left(
        PREC.cast,
        seq(field("value", $._expression), "as", field("type", $._type)),
      ),

    call_expression: ($) =>
      prec(
        PREC.call,
        seq(
          field("function", $._expression),
          field("arguments", $.argument_list),
        ),
      ),

    argument_list: ($) => seq("(", commaSep($._expression), ")"),

    field_expression: ($) =>
      prec(
        PREC.field,
        seq(field("value", $._expression), ".", field("field", $.identifier)),
      ),

    subscript_expression: ($) =>
      prec(
        PREC.field,
        seq(
          field("value", $._expression),
          "[",
          field("index", choice($._expression, $.range_expression)),
          "]",
        ),
      ),

    range_expression: ($) =>
      prec.left(
        PREC.comparative,
        seq(
          optional($._expression),
          choice("..", "..="),
          optional($._expression),
        ),
      ),

    parenthesized_expression: ($) => seq("(", $._expression, ")"),

    array_expression: ($) =>
      seq(
        "[",
        choice(commaSep($._expression), seq($._expression, ";", $._expression)),
        "]",
      ),

    struct_expression: ($) =>
      seq(
        field("name", optional(choice($.identifier, $.scoped_identifier))), // Wait, anonymous structs are just { x: 1 }!
        field("body", $.field_initializer_list),
      ),

    field_initializer_list: ($) => seq("{", commaSep($.field_initializer), "}"),
    field_initializer: ($) =>
      choice(
        seq(field("name", $.identifier), ":", field("value", $._expression)),
        field("name", $.identifier),
      ),

    macro_invocation: ($) =>
      seq(
        field("macro", $.at_identifier),
        "(",
        commaSep(choice($._expression, $._type)),
        ")",
      ),

    // Example: `std::mem::cmp`
    scoped_identifier: ($) =>
      prec(
        PREC.field,
        seq(
          field("path", choice($.identifier, $.scoped_identifier, "super")),
          "::",
          field("name", $.identifier),
        ),
      ),

    // Types
    _type: ($) =>
      choice(
        $.identifier,
        $.scoped_identifier,
        $.pointer_type,
        $.opaque_type,
        $.slice_type,
        $.array_type,
        $.tuple_type,
        $.optional_type,
        $.function_type,
      ),

    pointer_type: ($) => seq("*", optional("mut"), field("type", $._type)),
    opaque_type: ($) =>
      seq(
        "*",
        optional("mut"),
        "opaque",
        optional(field("trait", choice($.identifier, $.scoped_identifier))),
      ),
    slice_type: ($) =>
      seq("*", optional("mut"), "[", field("type", $._type), "]"),
    array_type: ($) =>
      seq(
        "[",
        field("type", $._type),
        ";",
        field("length", $._expression),
        "]",
      ),
    tuple_type: ($) => seq("(", commaSep($._type), ")"),
    optional_type: ($) => seq("?", field("type", $._type)),
    function_type: ($) =>
      seq(
        "fn",
        "(",
        commaSep($._type),
        ")",
        optional(seq("->", field("return_type", $._type))),
        optional(seq("throws", "(", commaSep(field("throws", $._type)), ")")),
      ),

    // Patterns
    _pattern: ($) =>
      choice(
        $.identifier,
        $.number_literal,
        $.string_literal,
        $.char_literal,
        $.boolean_literal,
        $.nil_literal,
        $.undefined_literal,
        $.placeholder_pattern,
        $.tuple_pattern,
        $.struct_pattern,
        $.tuple_struct_pattern,
        $.scoped_identifier,
        $.array_pattern,
        $.unary_pattern,
      ),

    // Example: `-1` inside `match cmp { case -1 => ... }`
    unary_pattern: ($) =>
      prec(
        PREC.unary,
        seq(choice("-", "!", "~", "not"), field("pattern", $._pattern)),
      ),

    array_pattern: ($) => seq("[", commaSep($._pattern), "]"),

    tuple_struct_pattern: ($) =>
      seq(
        field("type", choice($.identifier, $.scoped_identifier)),
        "(",
        commaSep($._pattern),
        ")",
      ),

    enum_pattern: ($) =>
      seq(
        field("path", $.scoped_identifier),
        field("body", $.field_pattern_list),
      ),

    placeholder_pattern: ($) => "_",
    tuple_pattern: ($) => seq("(", commaSep($._pattern), ")"),
    struct_pattern: ($) =>
      seq(
        field("type", choice($.identifier, $.scoped_identifier)),
        field("body", $.field_pattern_list),
      ),

    field_pattern_list: ($) =>
      seq("{", commaSep(choice($.field_pattern, "..")), "}"),

    field_pattern: ($) =>
      choice(
        seq(field("name", $.identifier), ":", field("pattern", $._pattern)),
        field("name", $.identifier),
      ),

    // Lexical Terminals (Regexes)
    identifier: ($) => /[a-zA-Z_][a-zA-Z0-9_#]*/,
    at_identifier: ($) => /@[a-zA-Z_][a-zA-Z0-9_]*/,
    number_literal: ($) => token(choice(/0x[0-9a-fA-F]+/, /0b[01]+/, /[0-9]+/)),
    string_literal: ($) => /"([^"\\]|\\.)*"/,
    char_literal: ($) => /'([^'\\]|\\.)'/,
    boolean_literal: ($) => choice("true", "false"),
    nil_literal: ($) => "nil",
    undefined_literal: ($) => "undefined",
  },
});
