import { ATTACHMENTS } from './attachments';
import { BODEGA_STOCK } from './items';
import { LOCATIONS } from './locations';
import { WEAPONS } from './weapons';

describe('location and Bodega config', () => {
  it('keeps four locations and gates Bodega and loan shark access', () => {
    expect(LOCATIONS).toHaveLength(4);
    expect(LOCATIONS.find((location) => location.locationId === 'the-bodega')).toMatchObject({
      displayName: 'The Bodega',
      hasBodega: true,
    });
    expect(
      LOCATIONS.find((location) => location.locationId === 'vista-creek-towers'),
    ).toMatchObject({
      displayName: 'Vista Creek Towers',
      hasLoanShark: true,
    });
  });

  it('matches the fixed Bodega catalog', () => {
    expect(BODEGA_STOCK.map((item) => item.displayName)).toEqual([
      'Snickers',
      'Bandages',
      'Narcan',
      'Amiri Jeans',
      'Crossbody Bag',
      'Trench Coat',
      'Beretta',
      'Glock 19',
      'Draco',
      'Switch',
      'Laser Beam',
    ]);
    expect(BODEGA_STOCK.map((item) => item.price)).toEqual([
      1_000,
      25_000,
      200_000,
      1_550,
      15_000,
      80_000,
      2_500,
      8_000,
      25_000,
      50_000,
      25_000,
    ]);
  });

  it('does not include stale equipment catalog assumptions', () => {
    const labels = new Set(BODEGA_STOCK.map((item) => item.displayName));

    expect(labels.has('Cargo Pants')).toBe(false);
    expect(labels.has('Bandage Wrap')).toBe(false);
    expect(labels.has('Ruger')).toBe(false);
    expect(labels.has('Glock 43X')).toBe(false);
  });

  it('defines weapon and attachment stats from config', () => {
    expect(WEAPONS).toEqual([
      expect.objectContaining({ weaponId: 'beretta', damage: 5, accuracy: 50 }),
      expect.objectContaining({ weaponId: 'glock_19', damage: 7, accuracy: 60 }),
      expect.objectContaining({ weaponId: 'draco', damage: 9, accuracy: 55 }),
    ]);
    expect(ATTACHMENTS).toEqual([
      expect.objectContaining({ attachmentId: 'switch', damageBonus: 2, accuracyBonus: 0 }),
      expect.objectContaining({ attachmentId: 'laser_beam', damageBonus: 0, accuracyBonus: 3 }),
    ]);
  });
});
