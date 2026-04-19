import { BODEGA_ITEM_BY_ID } from '../../../config/items';
import { LOCATION_BY_ID } from '../../../config/locations';
import type {
  ApparelItemId,
  AttachmentId,
  BodegaItemCategory,
  BodegaItemId,
  BodegaStockItem,
  EquipmentResult,
  PlayerRun,
  WeaponId,
} from '../../models/types';

function isAtBodega(run: PlayerRun): boolean {
  return LOCATION_BY_ID[run.currentLocationId].hasBodega === true;
}

function getItemId(item: BodegaStockItem): BodegaItemId {
  if ('itemId' in item) {
    return item.itemId;
  }

  if ('weaponId' in item) {
    return item.weaponId;
  }

  return item.attachmentId;
}

function getCategory(item: BodegaStockItem): BodegaItemCategory {
  return item.category;
}

function appendPurchaseLog(
  run: PlayerRun,
  item: BodegaStockItem,
  cashAfter: number,
): PlayerRun['actionLog'] {
  return [
    ...run.actionLog,
    {
      type: 'bodega-purchase',
      day: run.currentDay,
      locationId: run.currentLocationId,
      itemId: getItemId(item),
      category: getCategory(item),
      price: item.price,
      cashAfter,
    },
  ];
}

export function buyBodegaItem(
  run: PlayerRun,
  itemId: BodegaItemId,
): EquipmentResult {
  if (run.isRunEnded) {
    return { ok: false, reason: 'run-ended' };
  }

  if (!isAtBodega(run)) {
    return { ok: false, reason: 'unavailable-location' };
  }

  const item = (BODEGA_ITEM_BY_ID as Partial<Record<string, BodegaStockItem>>)[itemId];

  if (!item) {
    return { ok: false, reason: 'unknown-item' };
  }

  if (run.cash < item.price) {
    return { ok: false, reason: 'insufficient-cash' };
  }

  const cashAfter = run.cash - item.price;

  if ('healAmount' in item || 'reviveHealth' in item) {
    if (item.itemId === 'narcan') {
      return {
        ok: true,
        itemId,
        run: {
          ...run,
          cash: cashAfter,
          equipment: {
            ...run.equipment,
            ownedSurvivalItems: {
              ...run.equipment.ownedSurvivalItems,
              narcan: (run.equipment.ownedSurvivalItems.narcan ?? 0) + 1,
            },
          },
          actionLog: appendPurchaseLog(run, item, cashAfter),
        },
      };
    }

    return {
      ok: true,
      itemId,
      run: {
        ...run,
        cash: cashAfter,
        health: Math.min(100, run.health + (item.healAmount ?? 0)),
        actionLog: appendPurchaseLog(run, item, cashAfter),
      },
    };
  }

  if ('capacityBonus' in item) {
    if (run.equipment.ownedApparelItemIds.includes(item.itemId)) {
      return { ok: false, reason: 'already-owned' };
    }

    return {
      ok: true,
      itemId,
      run: {
        ...run,
        cash: cashAfter,
        capacityBonus: run.capacityBonus + item.capacityBonus,
        equipment: {
          ...run.equipment,
          ownedApparelItemIds: [
            ...run.equipment.ownedApparelItemIds,
            item.itemId as ApparelItemId,
          ],
        },
        actionLog: appendPurchaseLog(run, item, cashAfter),
      },
    };
  }

  if ('weaponId' in item) {
    if (run.equipment.ownedWeapons[item.weaponId]) {
      return { ok: false, reason: 'already-owned' };
    }

    const shouldAutoEquip = run.equipment.equippedWeaponLoadout.weaponId === null;

    return {
      ok: true,
      itemId,
      weaponId: item.weaponId,
      run: {
        ...run,
        cash: cashAfter,
        equipment: {
          ...run.equipment,
          ownedWeapons: {
            ...run.equipment.ownedWeapons,
            [item.weaponId]: {
              weaponId: item.weaponId,
              installedAttachmentIds: [],
            },
          },
          equippedWeaponLoadout: {
            weaponId: shouldAutoEquip
              ? item.weaponId
              : run.equipment.equippedWeaponLoadout.weaponId,
          },
        },
        actionLog: appendPurchaseLog(run, item, cashAfter),
      },
    };
  }

  if ('attachmentId' in item) {
    return {
      ok: true,
      itemId,
      attachmentId: item.attachmentId,
      run: {
        ...run,
        cash: cashAfter,
        equipment: {
          ...run.equipment,
          ownedAttachmentCounts: {
            ...run.equipment.ownedAttachmentCounts,
            [item.attachmentId]:
              (run.equipment.ownedAttachmentCounts[item.attachmentId] ?? 0) + 1,
          },
        },
        actionLog: appendPurchaseLog(run, item, cashAfter),
      },
    };
  }

  return { ok: false, reason: 'unknown-item' };
}

export function equipWeapon(run: PlayerRun, weaponId: WeaponId): EquipmentResult {
  if (run.isRunEnded) {
    return { ok: false, reason: 'run-ended' };
  }

  if (!run.equipment.ownedWeapons[weaponId]) {
    return { ok: false, reason: 'not-owned' };
  }

  return {
    ok: true,
    weaponId,
    run: {
      ...run,
      equipment: {
        ...run.equipment,
        equippedWeaponLoadout: { weaponId },
      },
      actionLog: [
        ...run.actionLog,
        {
          type: 'weapon-equipped',
          day: run.currentDay,
          locationId: run.currentLocationId,
          weaponId,
        },
      ],
    },
  };
}

export function installAttachmentOnWeapon(
  run: PlayerRun,
  attachmentId: AttachmentId,
  weaponId = run.equipment.equippedWeaponLoadout.weaponId,
): EquipmentResult {
  if (run.isRunEnded) {
    return { ok: false, reason: 'run-ended' };
  }

  if (!weaponId) {
    return { ok: false, reason: 'no-equipped-weapon' };
  }

  const ownedWeapon = run.equipment.ownedWeapons[weaponId];

  if (!ownedWeapon) {
    return { ok: false, reason: 'invalid-target' };
  }

  if ((run.equipment.ownedAttachmentCounts[attachmentId] ?? 0) <= 0) {
    return { ok: false, reason: 'no-attachment-owned' };
  }

  if (ownedWeapon.installedAttachmentIds.includes(attachmentId)) {
    return { ok: false, reason: 'attachment-already-installed' };
  }

  return {
    ok: true,
    weaponId,
    attachmentId,
    run: {
      ...run,
      equipment: {
        ...run.equipment,
        ownedWeapons: {
          ...run.equipment.ownedWeapons,
          [weaponId]: {
            ...ownedWeapon,
            installedAttachmentIds: [
              ...ownedWeapon.installedAttachmentIds,
              attachmentId,
            ],
          },
        },
        ownedAttachmentCounts: {
          ...run.equipment.ownedAttachmentCounts,
          [attachmentId]: (run.equipment.ownedAttachmentCounts[attachmentId] ?? 0) - 1,
        },
      },
      actionLog: [
        ...run.actionLog,
        {
          type: 'attachment-installed',
          day: run.currentDay,
          locationId: run.currentLocationId,
          weaponId,
          attachmentId,
        },
      ],
    },
  };
}
