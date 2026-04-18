import { DRUGS, DRUG_BY_ID } from './drugs';

describe('drug catalog', () => {
  it('contains exactly 14 unique products', () => {
    const ids = DRUGS.map((drug) => drug.drugId);

    expect(DRUGS).toHaveLength(14);
    expect(new Set(ids).size).toBe(DRUGS.length);

    for (const drug of DRUGS) {
      expect(DRUG_BY_ID[drug.drugId]).toBe(drug);
    }
  });

  it('has valid source-of-truth price data', () => {
    for (const drug of DRUGS) {
      expect(drug.displayName.length).toBeGreaterThan(0);
      expect(drug.unit.length).toBeGreaterThan(0);
      expect(Number.isInteger(drug.minPrice)).toBe(true);
      expect(Number.isInteger(drug.maxPrice)).toBe(true);
      expect(Number.isInteger(drug.normalAvg)).toBe(true);
      expect(drug.minPrice).toBeGreaterThan(0);
      expect(drug.maxPrice).toBeGreaterThanOrEqual(drug.minPrice);
      expect(drug.normalAvg).toBeGreaterThanOrEqual(drug.minPrice);
      expect(drug.normalAvg).toBeLessThanOrEqual(drug.maxPrice);
    }
  });

  it('does not include obsolete catalog ids or labels', () => {
    const ids = new Set(DRUGS.map((drug) => drug.drugId));
    const labels = new Set(DRUGS.map((drug) => drug.displayName));

    expect(ids.has('coke' as never)).toBe(false);
    expect(ids.has('acid' as never)).toBe(false);
    expect(ids.has('2cb' as never)).toBe(false);
    expect(ids.has('ecstasy' as never)).toBe(false);
    expect(ids.has('perc-30s' as never)).toBe(false);
    expect(labels.has('Coke')).toBe(false);
    expect(labels.has('Acid')).toBe(false);
    expect(labels.has('2CB')).toBe(false);
    expect(labels.has('Ecstasy')).toBe(false);
  });
});
