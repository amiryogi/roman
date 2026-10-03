import { describe, expect, it } from 'vitest';

import { initialFiles } from './bundle';

describe('initial files of a page', () => {
  it('follows static imports only, once each, and skips CSS', () => {
    const manifest = {
      'index.html': { file: 'assets/index.js', imports: ['_react.js'] },
      _react: { file: 'assets/unused.js' },
      '_react.js': { file: 'assets/react.js' },
      'src/Page.tsx': { file: 'assets/Page.js', imports: ['_react.js', '_styles.css'] },
      '_styles.css': { file: 'assets/styles.css' },
    };
    expect(initialFiles(manifest, ['index.html', 'src/Page.tsx']).sort()).toEqual([
      'assets/Page.js',
      'assets/index.js',
      'assets/react.js',
    ]);
  });

  it('fails loudly when a page module is missing from the manifest', () => {
    expect(() => initialFiles({}, ['src/Missing.tsx'])).toThrow('not in the build manifest');
  });
});
