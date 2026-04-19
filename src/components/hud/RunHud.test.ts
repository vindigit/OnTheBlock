import { readFileSync } from 'fs';
import { join } from 'path';

describe('RunHud attachment indicators', () => {
  const source = readFileSync(join(__dirname, 'RunHud.tsx'), 'utf8');

  it('renders compact indicators for installed weapon attachments', () => {
    expect(source).toContain('SW');
    expect(source).toContain('LB');
    expect(source).toContain('installedAttachmentIds');
  });
});
