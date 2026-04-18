import { DRUGS } from '../../../config/drugs';
import { MARKET_CONFIG } from '../../../config/economy';
import { LOCATIONS } from '../../../config/locations';
import type {
  DrugDefinition,
  DrugId,
  HiddenMarketConditionId,
  LocationId,
  LocationState,
} from '../../models/types';
import { createRng, deriveSeed, shuffleWithRng } from '../../../utils/rng';

type GenerateMarketInput = {
  seed: string;
  day: number;
  locationId: LocationId;
  hiddenMarketConditionId: HiddenMarketConditionId;
};

function clampPrice(price: number, drug: DrugDefinition): number {
  return Math.min(drug.maxPrice, Math.max(drug.minPrice, price));
}

export function getPriceEnvelope(
  drug: DrugDefinition,
  conditionId: HiddenMarketConditionId,
): readonly [number, number] {
  const volatilityScale = MARKET_CONFIG.conditionVolatilityScale[conditionId];
  const bias = MARKET_CONFIG.conditionPriceBias[conditionId];
  const centeredPrice = drug.normalAvg * bias;
  const lowSpread = (drug.normalAvg - drug.minPrice) * volatilityScale;
  const highSpread = (drug.maxPrice - drug.normalAvg) * volatilityScale;
  const minPrice = clampPrice(Math.round(centeredPrice - lowSpread), drug);
  const maxPrice = clampPrice(Math.round(centeredPrice + highSpread), drug);

  return minPrice <= maxPrice ? [minPrice, maxPrice] : [maxPrice, minPrice];
}

export function generateMarketForLocation(input: GenerateMarketInput): LocationState {
  const drugRng = createRng(deriveSeed(input.seed, [input.day, input.locationId, 'active-drugs']));
  const priceRng = createRng(deriveSeed(input.seed, [input.day, input.locationId, 'prices']));
  const activeDrugIds = shuffleWithRng(DRUGS, drugRng)
    .slice(0, MARKET_CONFIG.activeDrugCount)
    .map((drug) => drug.drugId);
  const localPriceMap: Partial<Record<DrugId, number>> = {};

  for (const drugId of activeDrugIds) {
    const drug = DRUGS.find((candidate) => candidate.drugId === drugId);

    if (!drug) {
      continue;
    }

    const [minPrice, maxPrice] = getPriceEnvelope(drug, input.hiddenMarketConditionId);
    localPriceMap[drugId] = priceRng.int(minPrice, maxPrice);
  }

  return {
    locationId: input.locationId,
    hiddenMarketConditionId: input.hiddenMarketConditionId,
    activeDrugIds,
    localPriceMap,
    accessState: 'open',
    timers: {},
  };
}

export function generateMarketsForDay(
  seed: string,
  day: number,
  previousStates: Record<LocationId, LocationState>,
): Record<LocationId, LocationState> {
  return Object.fromEntries(
    LOCATIONS.map((location) => [
      location.locationId,
      generateMarketForLocation({
        seed,
        day,
        locationId: location.locationId,
        hiddenMarketConditionId:
          previousStates[location.locationId].hiddenMarketConditionId,
      }),
    ]),
  ) as Record<LocationId, LocationState>;
}
