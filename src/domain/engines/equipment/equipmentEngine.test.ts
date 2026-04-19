import { getEquippedWeaponStats } from '../../selectors/runSelectors';
import { createNewRun } from '../run/runEngine';
import {
  buyBodegaItem,
  equipWeapon,
  installAttachmentOnWeapon,
} from './equipmentEngine';

function bodegaRun() {
  return {
    ...createNewRun({ seed: 'bodega-equipment' }),
    currentLocationId: 'the-bodega' as const,
    cash: 1_000_000,
    health: 80,
  };
}

describe('equipment engine', () => {
  it('buys survival items and caps healing at 100', () => {
    const run = bodegaRun();
    const first = buyBodegaItem(run, 'snickers');

    expect(first.ok).toBe(true);
    if (!first.ok) {
      return;
    }
    expect(first.run.health).toBe(90);

    const second = buyBodegaItem({ ...first.run, health: 95 }, 'bandages');
    expect(second.ok).toBe(true);
    if (!second.ok) {
      return;
    }
    expect(second.run.health).toBe(100);
  });

  it('stores Narcan as a single-use revive item', () => {
    const result = buyBodegaItem(bodegaRun(), 'narcan');

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.run.equipment.ownedSurvivalItems.narcan).toBe(1);
  });

  it('adds capacity from one-time apparel purchases', () => {
    const run = bodegaRun();
    const result = buyBodegaItem(run, 'crossbody_bag');

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.run.capacityBonus).toBe(run.capacityBonus + 50);
    expect(buyBodegaItem(result.run, 'crossbody_bag')).toEqual({
      ok: false,
      reason: 'already-owned',
    });
  });

  it('buys and equips weapons', () => {
    const first = buyBodegaItem(bodegaRun(), 'beretta');

    expect(first.ok).toBe(true);
    if (!first.ok) {
      return;
    }
    expect(first.run.equipment.equippedWeaponLoadout.weaponId).toBe('beretta');

    const second = buyBodegaItem(first.run, 'draco');
    expect(second.ok).toBe(true);
    if (!second.ok) {
      return;
    }
    const equipped = equipWeapon(second.run, 'draco');
    expect(equipped.ok).toBe(true);
    if (!equipped.ok) {
      return;
    }
    expect(equipped.run.equipment.equippedWeaponLoadout.weaponId).toBe('draco');
  });

  it('installs permanent attachment mods and derives weapon stats', () => {
    const weapon = buyBodegaItem(bodegaRun(), 'glock_19');
    expect(weapon.ok).toBe(true);
    if (!weapon.ok) {
      return;
    }
    const switchBuy = buyBodegaItem(weapon.run, 'switch');
    expect(switchBuy.ok).toBe(true);
    if (!switchBuy.ok) {
      return;
    }
    const laserBuy = buyBodegaItem(switchBuy.run, 'laser_beam');
    expect(laserBuy.ok).toBe(true);
    if (!laserBuy.ok) {
      return;
    }

    const switchInstall = installAttachmentOnWeapon(laserBuy.run, 'switch');
    expect(switchInstall.ok).toBe(true);
    if (!switchInstall.ok) {
      return;
    }
    const laserInstall = installAttachmentOnWeapon(switchInstall.run, 'laser_beam');
    expect(laserInstall.ok).toBe(true);
    if (!laserInstall.ok) {
      return;
    }

    expect(getEquippedWeaponStats(laserInstall.run)).toMatchObject({
      weaponId: 'glock_19',
      damage: 9,
      accuracy: 63,
      installedAttachmentIds: ['switch', 'laser_beam'],
    });
    expect(installAttachmentOnWeapon(laserInstall.run, 'switch')).toEqual({
      ok: false,
      reason: 'no-attachment-owned',
    });
  });

  it('requires Bodega access and cash', () => {
    expect(
      buyBodegaItem({ ...bodegaRun(), currentLocationId: 'velvet-heights' }, 'snickers'),
    ).toEqual({ ok: false, reason: 'unavailable-location' });
    expect(buyBodegaItem({ ...bodegaRun(), cash: 0 }, 'snickers')).toEqual({
      ok: false,
      reason: 'insufficient-cash',
    });
  });
});
