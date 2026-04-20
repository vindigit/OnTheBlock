import { readFileSync } from 'fs';
import { join } from 'path';

describe('app navigation setup', () => {
  const source = readFileSync(join(__dirname, 'AppNavigator.tsx'), 'utf8');

  it('does not expose Services as a bottom tab', () => {
    expect(source).not.toContain('name="Services"');
    expect(source).not.toContain('ServicesScreen');
  });

  it('uses stack routes for contextual Bodega and loan shark screens', () => {
    expect(source).toContain('name="Bodega"');
    expect(source).toContain('name="SharksOffice"');
  });

  it('delegates pending encounter UI to EncounterModal', () => {
    expect(source).toContain('EncounterModal');
    expect(source).toContain('EncounterResultModal');
    expect(source).toContain('pendingEncounter={run.pendingEncounter}');
    expect(source).toContain('dopeCarried={getCapacityUsed(run)}');
    expect(source).toContain('equippedWeaponStats={getEquippedWeaponStats(run)}');
    expect(source).toContain("result.outcome === 'contraband-seized'");
    expect(source).toContain('cashLost');
    expect(source).toContain('inventoryUnitsLost');
    expect(source).toContain("resolvePendingEncounter('surrender')");
    expect(source).toContain("resolvePendingEncounter('fight')");
    expect(source).not.toContain('function EncounterOverlay');
    expect(source).not.toContain('<Modal');
  });
});
