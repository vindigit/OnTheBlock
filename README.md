# On The Block

First playable React Native vertical slice for the phone-first On The Block MVP.

## Current Slice

- Expo + React Native + TypeScript scaffold.
- Core run start, HUD, market, inventory, travel, day advance, debt growth, and run-end summary.
- EZ Mart movement does not advance the day; debt can be paid from the Services tab.
- Config-driven 4-location / 14-product market generation with deterministic seeding.
- Pure domain modules for run, market, debt, trading, selectors, and save serialization.
- MMKV-backed save adapter with an in-memory test adapter.

## Commands

```bash
npm run start
npm run test
npm run lint
npm run typecheck
```

## Assumptions

- This first slice intentionally defers encounter resolution, EZ Mart bank, stash, weapons, attachments, and leaderboard networking.
- Final-day handling ends the run when travel reaches day 31, avoiding a day 32 state.
- Hidden market conditions affect price and volatility only; product availability is uniformly sampled so all 14 products appear evenly over time, with 8 active products per location.
- Debt is integer-dollar based and daily 4% growth uses `Math.ceil`.
- Inventory displays weighted average purchase price per held drug.
