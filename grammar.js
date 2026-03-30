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

function commaSep(rule) {
  return optional(commaSep1(rule));
}

function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)), optional(','));
}

module.exports = grammar({
  name: 'radiance',

  extras: $ => [
    /\s/,
    $.line_comment,
    $.doc_comment,
  ],

  word: $ => $.identifier,

  conflicts: $ => [
    [$._expression, $.struct_expression],
    [$.expression_statement],
    [$._statement, $.let_statement],
    [$.return_statement, $.cond_expression], [$.throw_statement, $.cond_expression], [$.panic_statement, $.cond_expression], [$.assert_statement, $.cond_expression],
    [$._expression, $.field_initializer],
    [$.block, $.field_initializer_list],
    [$.expression_statement, $.cond_expression],
    [$._type, $._expression],
    [$.return_statement], [$.throw_statement], [$.panic_statement], [$.assert_statement], [$.break_statement], [$.continue_statement], [$.let_statement],
    [$.function_type],
    [$._statement, $.match_arm],
    [$.expression_statement, $.match_arm],
    [$.if_statement],
    [$.match_statement],
    [$.while_statement], [$.for_statement],
    [$.opaque_type]
  ],

  rules: {
    source_file: $ => repeat($._statement),

    line_comment: $ => token(seq('//', /.*/)),
    doc_comment: $ => token(seq(choice('///', '//!'), /.*/)),

    _statement: $ => choice(
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
      $.block
    ),

    _declaration_statement: $ => choice(
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
    attributes: $ => repeat1($.attribute),
    attribute: $ => choice(
      '@default', '@test', '@intrinsic', 'pub', 'extern'
    ),

    // Declarations
    function_declaration: $ => seq(
      optional($.attributes),
      'fn',
      optional(seq('(', field('receiver_name', $.identifier), ':', field('receiver_type', $._type), ')')),
      field('name', $.identifier),
      field('parameters', $.parameter_list),
      optional(seq('->', field('return_type', $._type))),
      optional(seq('throws', '(', commaSep(field('throws', $._type)), ')')),
      field('body', choice($.block, ';'))
    ),

    parameter_list: $ => seq('(', commaSep($.parameter), ')'),
    parameter: $ => seq(field('name', $.identifier), ':', field('type', $._type)),

    record_declaration: $ => seq(
      optional($.attributes),
      'record',
      field('name', $.identifier),
      field('body', choice(
        $.record_field_declaration_list,
        seq('(', commaSep($._type), ')', ';')
      ))
    ),

    record_field_declaration_list: $ => seq('{', commaSep($.record_field_declaration), '}'),
    record_field_declaration: $ => seq(field('name', $.identifier), ':', field('type', $._type)),

    union_declaration: $ => seq(
      optional($.attributes),
      'union',
      field('name', $.identifier),
      field('body', $.union_variant_list)
    ),

    union_variant_list: $ => seq('{', commaSep($.union_variant), '}'),
    union_variant: $ => seq(
      field('name', $.identifier),
      optional(choice(
        seq('(', field('type', $._type), ')'),
        seq('=', field('value', $._expression)),
        field('fields', $.record_field_declaration_list)
      ))
    ),

    const_declaration: $ => seq(
      optional($.attributes),
      'const',
      field('name', $.identifier),
      ':',
      field('type', $._type),
      '=',
      field('value', $._expression),
      ';'
    ),

    static_declaration: $ => seq(
      optional($.attributes),
      'static',
      field('name', $.identifier),
      ':',
      field('type', $._type),
      '=',
      field('value', $._expression),
      ';'
    ),

    use_declaration: $ => seq(
      optional($.attributes),
      'use',
      field('path', $.scoped_identifier),
      ';'
    ),

    mod_declaration: $ => seq(
      optional($.attributes),
      'mod',
      field('name', $.identifier),
      ';'
    ),

    trait_declaration: $ => seq(
      optional($.attributes),
      'trait',
      field('name', $.identifier),
      optional(seq(':', field('supertraits', $.supertraits))),
      field('body', $.trait_body)
    ),

    supertraits: $ => seq($._type, repeat(seq('+', $._type))),

    trait_body: $ => seq('{', repeat($._trait_item), '}'),
    _trait_item: $ => choice(
      $.function_signature
    ),

    function_signature: $ => seq(
      'fn',
      optional(seq('(', field('receiver_type', $._type), ')')),
      field('name', $.identifier),
      field('parameters', $.parameter_list),
      optional(seq('->', field('return_type', $._type))),
      optional(seq('throws', '(', commaSep(field('throws', $._type)), ')')),
      ';'
    ),

    instance_declaration: $ => seq(
      optional($.attributes),
      'instance',
      field('trait', $.identifier),
      'for',
      field('type', $._type),
      field('body', $.instance_body)
    ),

    instance_body: $ => seq('{', repeat($.function_declaration), '}'),

    let_statement: $ => seq(
      'let',
      optional('case'),
      optional('mut'),
      field('pattern', $._pattern),
      optional(seq(':', field('type', $._type))),
      optional(seq('align', '(', field('align', $._expression), ')')),
      optional(seq('=', field('value', $._expression))),
      optional(seq(choice(';', 'if'), field('guard', $._expression))),
      optional(seq('else', field('else_branch', choice($.block, $._statement)))),
      ';'
    ),

    // Statements
    expression_statement: $ => seq(
      $._expression,
      optional(';')
    ),

    if_statement: $ => seq(
      'if',
      field('condition', choice($.let_condition, $._expression)),
      field('consequence', $.block),
      optional(seq('else', field('alternative', choice($.block, $.if_statement)))),
      optional(';')
    ),

    let_condition: $ => seq(
      'let',
      optional('case'),
      optional('mut'),
      field('pattern', $._pattern),
      '=',
      field('value', $._expression),
      optional(seq(choice(';', 'if'), field('guard', $._expression)))
    ),

    while_statement: $ => seq(
      'while',
      field('condition', choice($.let_condition, $._expression)),
      field('body', $.block),
      optional(seq('else', field('alternative', $.block)))
    ),

    for_statement: $ => seq(
      'for',
      field('pattern', $._pattern),
      optional(seq(',', field('index', $._pattern))),
      'in',
      field('value', choice($._expression, $.range_expression)),
      field('body', $.block),
      optional(seq('else', field('alternative', $.block)))
    ),

    loop_statement: $ => seq(
      'loop',
      field('body', choice($.block, ';'))
    ),

    match_statement: $ => seq(
      'match',
      field('value', $._expression),
      field('body', $.match_block),
      optional(';')
    ),

    match_block: $ => seq('{', repeat($.match_arm), '}'),
    match_arm: $ => seq(
      choice(
        seq('case', commaSep(field('pattern', $._pattern))),
        'else',
        field('pattern', $._pattern)
      ),
      optional(seq('if', field('guard', $._expression))),
      '=>',
      field('body', choice($._expression, $.block, $._statement)),
      optional(',')
    ),

    return_statement: $ => seq('return', optional($._expression), optional(';')),
    throw_statement: $ => seq('throw', $._expression, optional(';')),
    panic_statement: $ => seq('panic', optional($._expression), optional(';')),
    assert_statement: $ => seq('assert', choice($._expression, $.block), optional(seq(',', $._expression)), optional(';')),
    break_statement: $ => seq('break', optional(';')),
    continue_statement: $ => seq('continue', optional(';')),

    block: $ => seq('{', repeat($._statement), '}'),

    // Expressions
    _expression: $ => choice(
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
      $.cond_expression
    ),

    cond_expression: $ => prec.right(PREC.assign, seq(
      field('consequence', $._expression),
      'if',
      field('condition', $._expression),
      'else',
      field('alternative', $._expression)
    )),

    binary_expression: $ => {
      const ops = [
        ['*', PREC.multiplicative],
        ['/', PREC.multiplicative],
        ['%', PREC.multiplicative],
        ['+', PREC.additive],
        ['-', PREC.additive],
        ['<<', PREC.shift],
        ['>>', PREC.shift],
        ['&', PREC.bitand],
        ['^', PREC.bitxor],
        ['|', PREC.bitor],
        ['==', PREC.comparative],
        ['!=', PREC.comparative],
        ['<', PREC.comparative],
        ['<=', PREC.comparative],
        ['>', PREC.comparative],
        ['>=', PREC.comparative],
        ['and', PREC.and],
        ['or', PREC.or],
      ];

      return choice(
        ...ops.map(([operator, precedence]) => prec.left(precedence, seq(
          field('left', $._expression),
          field('operator', operator),
          field('right', $._expression)
        ))),
        ...[
          '=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>='
        ].map(operator => prec.right(PREC.assign, seq(
          field('left', $._expression),
          field('operator', operator),
          field('right', $._expression)
        )))
      );
    },

    unary_expression: $ => prec(PREC.unary, seq(
      choice('-', '!', '~', 'not'),
      field('operand', $._expression)
    )),

    try_expression: $ => prec.right(PREC.try, seq(
      'try', 
      optional(choice('!', '?')), 
      field('operand', $._expression),
      optional(seq(
        repeat1($.catch_clause)
      ))
    )),

    catch_clause: $ => seq(
      'catch',
      optional(seq(
        field('binding', $.identifier),
        optional(seq('as', field('type', $._type)))
      )),
      field('body', choice($.block, ';'))
    ),

    address_expression: $ => prec(PREC.unary, seq('&', optional('mut'), field('operand', $._expression))),

    deref_expression: $ => prec(PREC.unary, seq('*', field('operand', $._expression))),

    cast_expression: $ => prec.left(PREC.cast, seq(
      field('value', $._expression),
      'as',
      field('type', $._type)
    )),

    call_expression: $ => prec(PREC.call, seq(
      field('function', $._expression),
      field('arguments', $.argument_list)
    )),

    argument_list: $ => seq('(', commaSep($._expression), ')'),

    field_expression: $ => prec(PREC.field, seq(
      field('value', $._expression),
      '.',
      field('field', $.identifier)
    )),

    subscript_expression: $ => prec(PREC.field, seq(
      field('value', $._expression),
      '[',
      field('index', choice($._expression, $.range_expression)),
      ']'
    )),

    range_expression: $ => prec.left(PREC.comparative, seq(
      optional($._expression),
      choice('..', '..='),
      optional($._expression)
    )),

    parenthesized_expression: $ => seq('(', $._expression, ')'),

    array_expression: $ => seq(
      '[',
      choice(
        commaSep($._expression),
        seq($._expression, ';', $._expression)
      ),
      ']'
    ),

    struct_expression: $ => seq(
      field('name', optional(choice($.identifier, $.scoped_identifier))), // Wait, anonymous structs are just { x: 1 }!
      field('body', $.field_initializer_list)
    ),

    field_initializer_list: $ => seq('{', commaSep($.field_initializer), '}'),
    field_initializer: $ => choice(
      seq(field('name', $.identifier), ':', field('value', $._expression)),
      field('name', $.identifier)
    ),

    macro_invocation: $ => seq(
      field('macro', $.at_identifier),
      '(', commaSep(choice($._expression, $._type)), ')'
    ),

    scoped_identifier: $ => prec(PREC.field, seq(
      field('path', choice($.identifier, $.scoped_identifier, 'super')),
      '::',
      field('name', $.identifier)
    )),

    // Types
    _type: $ => choice(
      $.identifier,
      $.scoped_identifier,
      $.pointer_type,
      $.opaque_type,
      $.slice_type,
      $.array_type,
      $.tuple_type,
      $.optional_type,
      $.function_type
    ),

    pointer_type: $ => seq('*', optional('mut'), field('type', $._type)),
    opaque_type: $ => seq('*', optional('mut'), 'opaque', optional(field('trait', choice($.identifier, $.scoped_identifier)))),
    slice_type: $ => seq('*', optional('mut'), '[', field('type', $._type), ']'),
    array_type: $ => seq('[', field('type', $._type), ';', field('length', $._expression), ']'),
    tuple_type: $ => seq('(', commaSep($._type), ')'),
    optional_type: $ => seq('?', field('type', $._type)),
    function_type: $ => seq(
      'fn',
      '(', commaSep($._type), ')',
      optional(seq('->', field('return_type', $._type))),
      optional(seq('throws', '(', commaSep(field('throws', $._type)), ')'))
    ),

    // Patterns
    _pattern: $ => choice(
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
      $.unary_pattern
    ),

    unary_pattern: $ => prec(PREC.unary, seq(
      choice('-', '!', '~', 'not'),
      field('pattern', $._pattern)
    )),

    array_pattern: $ => seq('[', commaSep($._pattern), ']'),

    tuple_struct_pattern: $ => seq(
      field('type', choice($.identifier, $.scoped_identifier)),
      '(', commaSep($._pattern), ')'
    ),

    enum_pattern: $ => seq(
      field('path', $.scoped_identifier),
      field('body', $.field_pattern_list)
    ),

    placeholder_pattern: $ => '_',
    tuple_pattern: $ => seq('(', commaSep($._pattern), ')'),
    struct_pattern: $ => seq(
      field('type', choice($.identifier, $.scoped_identifier)),
      field('body', $.field_pattern_list)
    ),

    field_pattern_list: $ => seq('{', commaSep(choice($.field_pattern, '..')), '}'),

    field_pattern: $ => choice(
      seq(field('name', $.identifier), ':', field('pattern', $._pattern)),
      field('name', $.identifier)
    ),

    identifier: $ => /[a-zA-Z_][a-zA-Z0-9_#]*/,
    at_identifier: $ => /@[a-zA-Z_][a-zA-Z0-9_]*/,
    number_literal: $ => token(choice(
      /0x[0-9a-fA-F]+/,
      /0b[01]+/,
      /[0-9]+/
    )),
    string_literal: $ => /"([^"\\]|\\.)*"/,
    char_literal: $ => /'([^'\\]|\\.)'/,
    boolean_literal: $ => choice('true', 'false'),
    nil_literal: $ => 'nil',
    undefined_literal: $ => 'undefined',
  }
});
