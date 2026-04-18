export type DrugId =
  | 'coke_brick'
  | 'heroin'
  | 'two_cb_powder'
  | 'acid_sheet'
  | 'crack'
  | 'shrooms'
  | 'hashish'
  | 'ketamine'
  | 'speed'
  | 'vape_box'
  | 'weed'
  | 'molly'
  | 'perc_30s'
  | 'lean';

export type LocationId =
  | 'ashview-gardens'
  | 'vista-creek-towers'
  | 'velvet-heights'
  | 'ez-mart';

export type HiddenMarketConditionId =
  | 'steady'
  | 'discounted'
  | 'inflated'
  | 'choppy';

export type InventoryEntry = {
  quantity: number;
  averagePurchasePrice: number;
};

export type Inventory = Partial<Record<DrugId, InventoryEntry>>;

export type DrugDefinition = {
  drugId: DrugId;
  displayName: string;
  unit: string;
  minPrice: number;
  maxPrice: number;
  normalAvg: number;
};

export type LocationDefinition = {
  locationId: LocationId;
  displayName: string;
  mapNode: 1 | 2 | 3 | 4;
  mapPosition: {
    x: number;
    y: number;
  };
};

export type MarketQuote = {
  drugId: DrugId;
  price: number;
};

export type LocationState = {
  locationId: LocationId;
  hiddenMarketConditionId: HiddenMarketConditionId;
  activeDrugIds: DrugId[];
  localPriceMap: Partial<Record<DrugId, number>>;
  accessState: 'open';
  timers: Record<string, number>;
};

export type RunActionLogEntry =
  | {
      type: 'run-started';
      day: number;
      locationId: LocationId;
    }
  | {
      type: 'buy';
      day: number;
      locationId: LocationId;
      drugId: DrugId;
      quantity: number;
      unitPrice: number;
      total: number;
    }
  | {
      type: 'sell';
      day: number;
      locationId: LocationId;
      drugId: DrugId;
      quantity: number;
      unitPrice: number;
      total: number;
    }
  | {
      type: 'travel';
      fromLocationId: LocationId;
      toLocationId: LocationId;
      day: number;
      dayAdvanced: boolean;
      debtBefore: number;
      debtAfter: number;
    }
  | {
      type: 'debt-payment';
      day: number;
      locationId: LocationId;
      amount: number;
      debtBefore: number;
      debtAfter: number;
      cashAfter: number;
    }
  | {
      type: 'run-ended';
      day: number;
      reason: 'day-limit';
    };

export type PlayerRun = {
  runId: string;
  seed: string;
  currentDay: number;
  currentLocationId: LocationId;
  cash: number;
  debt: number;
  health: number;
  capacityBase: number;
  capacityBonus: number;
  inventory: Inventory;
  equippedWeaponId: string | null;
  bankBalance: number;
  stashInventory: Inventory;
  eventCooldowns: Record<string, number>;
  encounterHistory: string[];
  locationStates: Record<LocationId, LocationState>;
  actionLog: RunActionLogEntry[];
  isRunEnded: boolean;
  endReason?: 'day-limit';
};

export type SaveGame = {
  saveSlotId: string;
  serializedRunState: PlayerRun;
  createdAt: string;
  updatedAt: string;
  appVersion: string;
  saveVersion: number;
};

export type LeaderboardEntry = {
  entryId: string;
  score: number;
  netWorth: number;
  runLengthCompleted: number;
  timestamp: string;
  clientIntegrityFields: Record<string, string>;
};

export type TradeFailureReason =
  | 'run-ended'
  | 'invalid-quantity'
  | 'inactive-local-market'
  | 'insufficient-cash'
  | 'insufficient-capacity'
  | 'insufficient-inventory';

export type TradeResult =
  | {
      ok: true;
      run: PlayerRun;
      total: number;
      unitPrice: number;
      quantity: number;
    }
  | {
      ok: false;
      reason: TradeFailureReason;
    };

export type TravelResult =
  | {
      ok: true;
      run: PlayerRun;
      dayAdvanced: boolean;
      endedRun: boolean;
    }
  | {
      ok: false;
      reason: 'run-ended' | 'same-location' | 'unknown-location';
    };

export type DebtPaymentFailureReason =
  | 'run-ended'
  | 'invalid-amount'
  | 'no-cash'
  | 'no-debt'
  | 'insufficient-cash'
  | 'exceeds-debt';

export type DebtPaymentResult =
  | {
      ok: true;
      run: PlayerRun;
      amount: number;
    }
  | {
      ok: false;
      reason: DebtPaymentFailureReason;
    };

export type LoadSaveResult =
  | {
      ok: true;
      saveGame: SaveGame;
    }
  | {
      ok: false;
      reason: 'missing' | 'corrupt' | 'unsupported-version';
    };
