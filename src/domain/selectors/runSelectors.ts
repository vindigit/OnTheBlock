import { DRUG_BY_ID, DRUGS } from '../../config/drugs';
import { ATTACHMENT_BY_ID } from '../../config/attachments';
import { BODEGA_STOCK } from '../../config/items';
import { LOCATION_BY_ID } from '../../config/locations';
import { WEAPON_BY_ID } from '../../config/weapons';
import type {
  AttachmentId,
  BodegaStockItem,
  DrugId,
  MarketQuote,
  PlayerRun,
  WeaponId,
} from '../models/types';

export function getCapacityMax(run: PlayerRun): number {
  return run.capacityBase + run.capacityBonus;
}

export function getCapacityUsed(run: PlayerRun): number {
  return Object.values(run.inventory).reduce(
    (sum, entry) => sum + (entry?.quantity ?? 0),
    0,
  );
}

export function getFreeCapacity(run: PlayerRun): number {
  return getCapacityMax(run) - getCapacityUsed(run);
}

export function getHeldQuantity(run: PlayerRun, drugId: DrugId): number {
  return run.inventory[drugId]?.quantity ?? 0;
}

export function getAveragePurchasePrice(run: PlayerRun, drugId: DrugId): number | null {
  return run.inventory[drugId]?.averagePurchasePrice ?? null;
}

export function getCurrentLocationName(run: PlayerRun): string {
  return LOCATION_BY_ID[run.currentLocationId].displayName;
}

export function canAccessBodega(run: PlayerRun): boolean {
  return LOCATION_BY_ID[run.currentLocationId].hasBodega === true;
}

export function canAccessLoanShark(run: PlayerRun): boolean {
  return LOCATION_BY_ID[run.currentLocationId].hasLoanShark === true;
}

export function getCurrentMarketQuotes(run: PlayerRun): MarketQuote[] {
  const locationState = run.locationStates[run.currentLocationId];

  return locationState.activeDrugIds.map((drugId) => ({
    drugId,
    price: locationState.localPriceMap[drugId] ?? 0,
  }));
}

export function isDrugActiveInCurrentLocation(run: PlayerRun, drugId: DrugId): boolean {
  return run.locationStates[run.currentLocationId].activeDrugIds.includes(drugId);
}

export function getCurrentPrice(run: PlayerRun, drugId: DrugId): number | null {
  if (!isDrugActiveInCurrentLocation(run, drugId)) {
    return null;
  }

  return run.locationStates[run.currentLocationId].localPriceMap[drugId] ?? null;
}

export function getMaxBuyQuantity(run: PlayerRun, drugId: DrugId): number {
  const price = getCurrentPrice(run, drugId);

  if (price === null || price <= 0) {
    return 0;
  }

  return Math.min(Math.floor(run.cash / price), getFreeCapacity(run));
}

export function getMaxSellQuantity(run: PlayerRun, drugId: DrugId): number {
  if (!isDrugActiveInCurrentLocation(run, drugId)) {
    return 0;
  }

  return getHeldQuantity(run, drugId);
}

export function getInventoryRows(run: PlayerRun) {
  return DRUGS.map((drug) => ({
    drug,
    quantity: run.inventory[drug.drugId]?.quantity ?? 0,
    averagePurchasePrice: run.inventory[drug.drugId]?.averagePurchasePrice ?? null,
  })).filter((row) => row.quantity > 0);
}

export function getDrugName(drugId: DrugId): string {
  return DRUG_BY_ID[drugId].displayName;
}

export function getNetAfterDebt(run: PlayerRun): number {
  return run.cash - run.debt;
}

export function getInstalledAttachmentIds(run: PlayerRun): AttachmentId[] {
  const weaponId = run.equipment.equippedWeaponLoadout.weaponId;

  if (!weaponId) {
    return [];
  }

  return run.equipment.ownedWeapons[weaponId]?.installedAttachmentIds ?? [];
}

export function getEquippedWeaponStats(run: PlayerRun): {
  weaponId: WeaponId;
  displayName: string;
  damage: number;
  accuracy: number;
  installedAttachmentIds: AttachmentId[];
} | null {
  const weaponId = run.equipment.equippedWeaponLoadout.weaponId;

  if (!weaponId) {
    return null;
  }

  const weapon = WEAPON_BY_ID[weaponId];
  const installedAttachmentIds = getInstalledAttachmentIds(run);
  const attachmentBonuses = installedAttachmentIds.reduce(
    (total, attachmentId) => {
      const attachment = ATTACHMENT_BY_ID[attachmentId];

      return {
        damage: total.damage + attachment.damageBonus,
        accuracy: total.accuracy + attachment.accuracyBonus,
      };
    },
    { damage: 0, accuracy: 0 },
  );

  return {
    weaponId,
    displayName: weapon.displayName,
    damage: weapon.damage + attachmentBonuses.damage,
    accuracy: weapon.accuracy + attachmentBonuses.accuracy,
    installedAttachmentIds,
  };
}

export function getBodegaStock(): BodegaStockItem[] {
  return BODEGA_STOCK;
}
