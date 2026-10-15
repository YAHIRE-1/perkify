# Security and performance

- Validate and sanitize input at trust boundaries.
- Avoid `dangerouslySetInnerHTML` unless the content has a defined sanitization path. Do not use `eval()` or assign directly to `document.cookie`.
- For links with `target="_blank"`, include `rel="noopener"`.
- Avoid copying an accumulator with spread syntax on every loop iteration.
- Keep reusable regular expressions outside hot loops.
- Prefer specific imports. Avoid new barrel files unless a package's public API calls for one; existing database exports have explicit lint exceptions.
