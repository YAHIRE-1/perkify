# TypeScript and JavaScript

- Add parameter and return types when they clarify an API. Prefer `unknown` to `any` for values whose type is not yet known.
- Use type narrowing before a type assertion. Use `as const` when literal or readonly types are needed.
- Replace repeated numeric literals with named constants when the value's meaning is otherwise unclear.
- Default to `const`; use `let` only when reassignment is needed. Prefer `for...of` for loops with side effects.
- Use optional chaining and nullish coalescing when a value may be absent. Use destructuring and template literals when they make the code clearer.
- Prefer `async`/`await` for sequential async work. Await or return promises deliberately; handle expected failures and do not catch an error only to rethrow it.
- Do not use an async function as a `Promise` executor. Throw `Error` objects with useful messages.
