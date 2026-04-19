import { readFileSync } from 'fs';
import { join } from 'path';

describe('MarketScreen contextual access', () => {
  const source = readFileSync(join(__dirname, 'MarketScreen.tsx'), 'utf8');

  it('exposes Bodega and Big Sal actions through location selectors', () => {
    expect(source).toContain('canAccessBodega');
    expect(source).toContain('canAccessLoanShark');
    expect(source).toContain('Bodega Menu');
    expect(source).toContain('Meet Big Sal');
  });
});
