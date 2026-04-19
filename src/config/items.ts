import type {
  ApparelItemDefinition,
  BodegaItemId,
  BodegaStockItem,
  SurvivalItemDefinition,
} from '../domain/models/types';
import { ATTACHMENTS } from './attachments';
import { WEAPONS } from './weapons';

export const SURVIVAL_ITEMS: SurvivalItemDefinition[] = [
  {
    itemId: 'snickers',
    displayName: 'Snickers',
    price: 1_000,
    category: 'survival',
    description: '+10 Health',
    healAmount: 10,
  },
  {
    itemId: 'bandages',
    displayName: 'Bandages',
    price: 25_000,
    category: 'survival',
    description: '+25 Health',
    healAmount: 25,
  },
  {
    itemId: 'narcan',
    displayName: 'Narcan',
    price: 200_000,
    category: 'survival',
    description: 'Revive (Auto-trigger at 0 HP)',
    reviveHealth: 25,
  },
];

export const APPAREL_ITEMS: ApparelItemDefinition[] = [
  {
    itemId: 'amiri_jeans',
    displayName: 'Amiri Jeans',
    price: 1_550,
    category: 'apparel',
    description: '+20 Capacity',
    capacityBonus: 20,
  },
  {
    itemId: 'crossbody_bag',
    displayName: 'Crossbody Bag',
    price: 15_000,
    category: 'apparel',
    description: '+50 Capacity',
    capacityBonus: 50,
  },
  {
    itemId: 'trench_coat',
    displayName: 'Trench Coat',
    price: 80_000,
    category: 'apparel',
    description: '+100 Capacity',
    capacityBonus: 100,
  },
];

export const BODEGA_STOCK: BodegaStockItem[] = [
  ...SURVIVAL_ITEMS,
  ...APPAREL_ITEMS,
  ...WEAPONS,
  ...ATTACHMENTS,
];

export const BODEGA_ITEM_BY_ID = Object.fromEntries(
  BODEGA_STOCK.map((item) => {
    if ('itemId' in item) {
      return [item.itemId, item];
    }

    if ('weaponId' in item) {
      return [item.weaponId, item];
    }

    return [item.attachmentId, item];
  }),
) as Record<BodegaItemId, BodegaStockItem>;
