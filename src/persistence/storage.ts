export type KeyValueStorage = {
  getString: (key: string) => string | undefined;
  setString: (key: string, value: string) => void;
  delete: (key: string) => void;
};

export class InMemoryStorage implements KeyValueStorage {
  private values = new Map<string, string>();

  getString(key: string): string | undefined {
    return this.values.get(key);
  }

  setString(key: string, value: string): void {
    this.values.set(key, value);
  }

  delete(key: string): void {
    this.values.delete(key);
  }
}

export function createDefaultStorage(): KeyValueStorage {
  return new InMemoryStorage();
}
