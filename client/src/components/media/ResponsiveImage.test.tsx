import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createMediaUrls } from '@/lib/cloudinary';

import { ResponsiveImage } from './ResponsiveImage';

const urls = createMediaUrls('demo-cloud');
const asset = {
  publicId: 'root/gallery/abc',
  resourceType: 'image' as const,
  version: 5,
  format: 'jpg',
  bytes: 1000,
  width: 2000,
  height: 1000,
  dominantColor: '#2b2118',
};

describe('ResponsiveImage', () => {
  it('renders a lazy, sized image with srcset, sizes and a colour placeholder', () => {
    render(<ResponsiveImage asset={asset} alt="On stage" sizes="100vw" urls={urls} />);
    const img = screen.getByRole('img', { name: 'On stage' });

    expect(img).toHaveAttribute('width', '2000');
    expect(img).toHaveAttribute('height', '1000');
    expect(img).toHaveAttribute('sizes', '100vw');
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('decoding', 'async');
    expect(img.getAttribute('srcset')).toContain(
      'c_limit,w_320,f_auto,q_auto/v5/root/gallery/abc 320w',
    );
    expect(img.getAttribute('srcset')).toMatch(/ 2000w$/);
    expect(img.getAttribute('src')).toContain('c_limit,w_1024,');
    expect(img).toHaveStyle({ backgroundColor: '#2b2118' });
  });

  it('crops to an aspect ratio and reports the cropped dimensions', () => {
    render(<ResponsiveImage asset={asset} alt="Square" sizes="50vw" aspect={1} urls={urls} />);
    const img = screen.getByRole('img', { name: 'Square' });

    expect(img).toHaveAttribute('width', '1000');
    expect(img).toHaveAttribute('height', '1000');
    expect(img.getAttribute('src')).toContain('c_fill,g_auto,w_1000,h_1000');
  });

  it('loads the priority image eagerly', () => {
    render(<ResponsiveImage asset={asset} alt="Hero" sizes="100vw" priority urls={urls} />);
    const img = screen.getByRole('img', { name: 'Hero' });

    expect(img).toHaveAttribute('loading', 'eager');
    expect(img).toHaveAttribute('fetchpriority', 'high');
  });
});
