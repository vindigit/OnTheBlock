import { getBuyFlowProductName } from './productDisplay';

describe('product display helpers', () => {
  it('removes parenthetical product forms for the buy flow', () => {
    expect(getBuyFlowProductName('Coke (Brick)')).toBe('Coke');
    expect(getBuyFlowProductName('Acid (Sheet)')).toBe('Acid');
    expect(getBuyFlowProductName('2C-B (Powder)')).toBe('2C-B');
  });

  it('leaves names without parenthetical forms unchanged', () => {
    expect(getBuyFlowProductName('Vape Box')).toBe('Vape Box');
    expect(getBuyFlowProductName('Perc 30s')).toBe('Perc 30s');
    expect(getBuyFlowProductName('Molly')).toBe('Molly');
  });
});
