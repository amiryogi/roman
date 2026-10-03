// `@roman/shared/lite`: the parts of the contract that don't need Zod (plain values and pure
// functions). Public pages import these statically and load the schemas only when validating a
// response, which keeps Zod out of the initial JavaScript (plan §16).
export * from './constants.js';
export * from './timezone.js';
