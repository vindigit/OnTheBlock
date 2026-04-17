export type SeededRng = {
  next: () => number;
  int: (minInclusive: number, maxInclusive: number) => number;
  pick: <T>(items: readonly T[]) => T;
};

export function hashSeed(input: string | number): number {
  const text = String(input);
  let hash = 2166136261;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function deriveSeed(baseSeed: string, parts: readonly (string | number)[]): string {
  return [baseSeed, ...parts].join(':');
}

export function createRng(seed: string | number): SeededRng {
  let state = hashSeed(seed);

  const next = () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    int: (minInclusive, maxInclusive) => {
      const min = Math.ceil(minInclusive);
      const max = Math.floor(maxInclusive);
      return Math.floor(next() * (max - min + 1)) + min;
    },
    pick: (items) => {
      if (items.length === 0) {
        throw new Error('Cannot pick from an empty array.');
      }

      return items[Math.floor(next() * items.length)];
    },
  };
}

export function shuffleWithRng<T>(items: readonly T[], rng: SeededRng): T[] {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = rng.int(0, index);
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

export function createRunSeed(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
