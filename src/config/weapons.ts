import type { WeaponDefinition } from '../domain/models/types';

export const WEAPONS: WeaponDefinition[] = [
  {
    weaponId: 'beretta',
    displayName: 'Beretta',
    price: 2_500,
    category: 'defense',
    damage: 5,
    accuracy: 50,
    description: 'Damage 5, Accuracy 50%',
  },
  {
    weaponId: 'glock_19',
    displayName: 'Glock 19',
    price: 8_000,
    category: 'defense',
    damage: 7,
    accuracy: 60,
    description: 'Damage 7, Accuracy 60%',
  },
  {
    weaponId: 'draco',
    displayName: 'Draco',
    price: 25_000,
    category: 'defense',
    damage: 9,
    accuracy: 55,
    description: 'Damage 9, Accuracy 55%',
  },
];

export const WEAPON_BY_ID = Object.fromEntries(
  WEAPONS.map((weapon) => [weapon.weaponId, weapon]),
) as Record<WeaponDefinition['weaponId'], WeaponDefinition>;
