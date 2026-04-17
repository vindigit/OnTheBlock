import { createRng, deriveSeed, shuffleWithRng } from './rng';

describe('seeded rng', () => {
  it('replays the same sequence for the same seed', () => {
    const first = createRng('qa-seed');
    const second = createRng('qa-seed');

    expect([first.next(), first.next(), first.int(1, 10)]).toEqual([
      second.next(),
      second.next(),
      second.int(1, 10),
    ]);
  });

  it('supports deterministic derived shuffles', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];
    const seed = deriveSeed('run', ['day', 1]);

    expect(shuffleWithRng(items, createRng(seed))).toEqual(
      shuffleWithRng(items, createRng(seed)),
    );
  });
});
