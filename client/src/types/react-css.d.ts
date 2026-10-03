// CSS custom properties set from components (the string-range slider). Augmenting React's type
// keeps `style` typed without assertions. The import makes this file a module, so it extends
// React's declarations instead of replacing them.
import 'react';

declare module 'react' {
  interface CSSProperties {
    '--progress'?: string;
    '--buffered'?: string;
  }
}
