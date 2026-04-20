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
  | 'the-bodega';

export type SurvivalItemId = 'snickers' | 'bandages' | 'narcan';

export type ApparelItemId = 'amiri_jeans' | 'crossbody_bag' | 'trench_coat';

export type WeaponId = 'beretta' | 'glock_19' | 'draco';

export type AttachmentId = 'switch' | 'laser_beam';

export type BodegaItemId =
  | SurvivalItemId
  | ApparelItemId
  | WeaponId
  | AttachmentId;

export type BodegaItemCategory = 'survival' | 'apparel' | 'defense' | 'attachments';

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
  hasBodega?: boolean;
  hasLoanShark?: boolean;
};

export type SurvivalItemDefinition = {
  itemId: SurvivalItemId;
  displayName: string;
  price: number;
  category: 'survival';
  description: string;
  healAmount?: number;
  reviveHealth?: number;
};

export type ApparelItemDefinition = {
  itemId: ApparelItemId;
  displayName: string;
  price: number;
  category: 'apparel';
  description: string;
  capacityBonus: number;
};

export type WeaponDefinition = {
  weaponId: WeaponId;
  displayName: string;
  price: number;
  category: 'defense';
  damage: number;
  accuracy: number;
  description: string;
};

export type AttachmentDefinition = {
  attachmentId: AttachmentId;
  displayName: string;
  price: number;
  category: 'attachments';
  damageBonus: number;
  accuracyBonus: number;
  description: string;
};

export type BodegaStockItem =
  | SurvivalItemDefinition
  | ApparelItemDefinition
  | WeaponDefinition
  | AttachmentDefinition;

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
      type: 'bodega-purchase';
      day: number;
      locationId: LocationId;
      itemId: BodegaItemId;
      category: BodegaItemCategory;
      price: number;
      cashAfter: number;
    }
  | {
      type: 'weapon-equipped';
      day: number;
      locationId: LocationId;
      weaponId: WeaponId;
    }
  | {
      type: 'attachment-installed';
      day: number;
      locationId: LocationId;
      weaponId: WeaponId;
      attachmentId: AttachmentId;
    }
  | {
      type: 'encounter-resolved';
      day: number;
      locationId: LocationId;
      encounterId: string;
      encounterType: EncounterType;
      choice: EncounterChoice;
      outcome: EncounterOutcome;
    }
  | {
      type: 'run-ended';
      day: number;
      reason: RunEndReason;
    };

export type OwnedWeapon = {
  weaponId: WeaponId;
  installedAttachmentIds: AttachmentId[];
};

export type PlayerRunEquipment = {
  ownedSurvivalItems: Partial<Record<SurvivalItemId, number>>;
  ownedApparelItemIds: ApparelItemId[];
  ownedWeapons: Partial<Record<WeaponId, OwnedWeapon>>;
  ownedAttachmentCounts: Partial<Record<AttachmentId, number>>;
  equippedWeaponLoadout: {
    weaponId: WeaponId | null;
  };
};

export type EncounterType =
  | 'big-sal-interception'
  | 'mugging'
  | 'police-chase'
  | 'legacy';

export type EncounterChoice = 'hand-it-over' | 'surrender' | 'run' | 'fight';

export type EncounterOutcome =
  | 'paid'
  | 'surrendered'
  | 'escaped'
  | 'caught'
  | 'caught-revived'
  | 'caught-run-ended'
  | 'fought-off'
  | 'mugged'
  | 'officer-killed'
  | 'fight-continued'
  | 'wounded'
  | 'contraband-seized';

export type PendingEncounter = {
  encounterId: string;
  type: 'big-sal-interception' | 'mugging' | 'police-chase';
  title: string;
  body: string;
  createdDay: number;
  fromLocationId: LocationId;
  toLocationId: LocationId;
  debtAtTrigger?: number;
  cashAtTrigger?: number;
  deputyCount?: number;
  officersRemaining?: number;
  officersDefeated?: number;
  round?: number;
  lastRoundSummary?: string;
};

export type EncounterHistoryEntry = {
  encounterId: string;
  type: EncounterType;
  day: number;
  locationId: LocationId;
  choice: EncounterChoice | 'legacy';
  outcome: EncounterOutcome | 'legacy';
  cashLost?: number;
  debtReduced?: number;
  healthLost?: number;
  inventoryUnitsLost?: number;
  fightSuccessChance?: number;
  weaponId?: WeaponId;
  cashRewarded?: number;
  deputiesCount?: number;
  officersDefeated?: number;
};

export type RunEndReason = 'day-limit' | 'health-zero';

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
  equipment: PlayerRunEquipment;
  bankBalance: number;
  stashInventory: Inventory;
  eventCooldowns: Record<string, number>;
  encounterHistory: EncounterHistoryEntry[];
  pendingEncounter: PendingEncounter | null;
  locationStates: Record<LocationId, LocationState>;
  actionLog: RunActionLogEntry[];
  isRunEnded: boolean;
  endReason?: RunEndReason;
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
      triggeredEncounter: boolean;
    }
  | {
      ok: false;
      reason: 'run-ended' | 'same-location' | 'unknown-location' | 'pending-encounter';
    };

export type DebtPaymentFailureReason =
  | 'run-ended'
  | 'invalid-amount'
  | 'no-cash'
  | 'no-debt'
  | 'insufficient-cash'
  | 'exceeds-debt'
  | 'unavailable-location';

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

export type EquipmentFailureReason =
  | 'run-ended'
  | 'unavailable-location'
  | 'unknown-item'
  | 'insufficient-cash'
  | 'already-owned'
  | 'not-owned'
  | 'no-equipped-weapon'
  | 'no-attachment-owned'
  | 'attachment-already-installed'
  | 'invalid-target';

export type EquipmentResult =
  | {
      ok: true;
      run: PlayerRun;
      itemId?: BodegaItemId;
      weaponId?: WeaponId;
      attachmentId?: AttachmentId;
    }
  | {
      ok: false;
      reason: EquipmentFailureReason;
    };

export type EncounterResolutionResult =
  | {
      ok: true;
      run: PlayerRun;
      outcome: EncounterOutcome;
    }
  | {
      ok: false;
      reason: 'run-ended' | 'no-pending-encounter' | 'invalid-choice' | 'no-equipped-weapon';
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
