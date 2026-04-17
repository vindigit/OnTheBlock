import { DRUGS } from '../../../config/drugs';
import { MARKET_CONFIG } from '../../../config/economy';
import { LOCATIONS } from '../../../config/locations';
import type {
  DrugDefinition,
  DrugId,
  HiddenMarketConditionId,
  LocationId,
  LocationState,
  VolatilityClass,
} from '../../models/types';
import { createRng, deriveSeed, shuffleWithRng } from '../../../utils/rng';

type GenerateMarketInput = {
  seed: string;
  day: number;
  locationId: LocationId;
  hiddenMarketConditionId: HiddenMarketConditionId;
};

function scaleVolatilityRange(
  volatilityClass: VolatilityClass,
  conditionId: HiddenMarketConditionId,
): readonly [number, number] {
  const [baseMin, baseMax] = MARKET_CONFIG.volatilityRanges[volatilityClass];
  const scale = MARKET_CONFIG.conditionVolatilityScale[conditionId];
  return [1 + (baseMin - 1) * scale, 1 + (baseMax - 1) * scale];
}

export function getPriceEnvelope(
  drug: DrugDefinition,
  conditionId: HiddenMarketConditionId,
): readonly [number, number] {
  const [volatilityMin, volatilityMax] = scaleVolatilityRange(
    drug.volatilityClass,
    conditionId,
  );
  const bias = MARKET_CONFIG.conditionPriceBias[conditionId];

  return [
    Math.max(1, Math.round(drug.priceBandMin * volatilityMin * bias)),
    Math.max(1, Math.round(drug.priceBandMax * volatilityMax * bias)),
  ];
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
