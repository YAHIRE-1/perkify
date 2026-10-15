# React and accessibility

These instructions apply to the React 19 web app and shared UI components.

- Use function components. Call hooks at the top level and keep dependency arrays accurate.
- Define components at module scope. Give rendered collections stable keys from the data where possible.
- Place children between component tags rather than passing them through a `children` prop when writing JSX.
- Pass refs as props in React 19 components instead of adding `forwardRef` to new components.
- Use semantic elements. Give form controls labels, images meaningful alt text, and pages a sensible heading order.
- Ensure interactive controls work with a keyboard. Prefer native buttons and links over click handlers on generic elements.
