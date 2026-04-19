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
});
