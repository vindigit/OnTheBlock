import { DRUGS, DRUG_BY_ID } from '../../../config/drugs';
import { MARKET_CONFIG } from '../../../config/economy';
import { generateMarketForLocation, getPriceEnvelope } from './marketEngine';

describe('market engine', () => {
  it('generates exactly 8 active drugs from the 12-drug catalog', () => {
    const market = generateMarketForLocation({
      seed: 'market',
      day: 1,
      locationId: 'ez-mart',
      hiddenMarketConditionId: 'steady',
    });

    expect(market.activeDrugIds).toHaveLength(MARKET_CONFIG.activeDrugCount);
    expect(new Set(market.activeDrugIds).size).toBe(MARKET_CONFIG.activeDrugCount);

    for (const drugId of market.activeDrugIds) {
      expect(DRUG_BY_ID[drugId]).toBeDefined();
    }

    expect(DRUGS).toHaveLength(12);
  });

  it('is stable for the same seed, day, and location', () => {
    const input = {
      seed: 'stable',
      day: 4,
      locationId: 'velvet-heights' as const,
      hiddenMarketConditionId: 'choppy' as const,
    };

    expect(generateMarketForLocation(input)).toEqual(generateMarketForLocation(input));
  });

  it('keeps prices inside the configured envelope', () => {
    const market = generateMarketForLocation({
      seed: 'envelope',
      day: 6,
      locationId: 'ashview-gardens',
      hiddenMarketConditionId: 'inflated',
    });

    for (const drugId of market.activeDrugIds) {
      const price = market.localPriceMap[drugId] ?? 0;
      const [minPrice, maxPrice] = getPriceEnvelope(DRUG_BY_ID[drugId], 'inflated');
      expect(price).toBeGreaterThanOrEqual(minPrice);
      expect(price).toBeLessThanOrEqual(maxPrice);
    }
  });
});
