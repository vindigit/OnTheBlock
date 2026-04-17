import { createNewRun } from '../domain/engines/run/runEngine';
import { InMemoryStorage } from './storage';
import {
  SAVE_GAME_KEY,
  createSaveGame,
  deserializeSaveGame,
  loadSavedRun,
  saveRun,
  serializeSaveGame,
} from './saveGame';

describe('save game persistence', () => {
  it('round trips a versioned save game', () => {
    const run = createNewRun({ seed: 'save' });
    const saveGame = createSaveGame(run, 'test');
    const parsed = deserializeSaveGame(serializeSaveGame(saveGame));

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }
    expect(parsed.saveGame.serializedRunState).toEqual(run);
    expect(parsed.saveGame.saveVersion).toBe(1);
  });

  it('loads through a storage adapter', () => {
    const storage = new InMemoryStorage();
    const run = createNewRun({ seed: 'adapter' });

    saveRun(storage, run);

    const result = loadSavedRun(storage);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.saveGame.serializedRunState.runId).toBe(run.runId);
  });

  it('handles corrupted and unsupported saves', () => {
    const storage = new InMemoryStorage();
    storage.setString(SAVE_GAME_KEY, '{bad json');
    expect(loadSavedRun(storage)).toEqual({ ok: false, reason: 'corrupt' });

    storage.setString(SAVE_GAME_KEY, JSON.stringify({ saveVersion: 999 }));
    expect(loadSavedRun(storage)).toEqual({
      ok: false,
      reason: 'unsupported-version',
    });
  });
});
