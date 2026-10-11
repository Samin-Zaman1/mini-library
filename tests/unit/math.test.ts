import { describe, expect, it } from 'vitest';
import { add, formatName, multiply } from '../../src/math';

describe('math helpers', () => {
  it('adds two numbers', () => {
    expect(add(2, 3)).toBe(5);
  });

  it('multiplies two numbers', () => {
    expect(multiply(4, 5)).toBe(20);
  });

  it('trims name input', () => {
    expect(formatName('  Mini Library  ')).toBe('Mini Library');
  });
});
