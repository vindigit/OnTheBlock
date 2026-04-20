import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import type { PendingEncounter } from '../../domain/models/types';
import { EncounterModal } from './EncounterModal';

const pendingEncounter: PendingEncounter = {
  encounterId: 'big-sal-modal-test',
  type: 'big-sal-interception',
  title: 'Blocked!',
  body: "Big Sal's crew cuts you off in the alley. They don't want to talk about prices; they want what you owe.",
  createdDay: 4,
  fromLocationId: 'velvet-heights',
  toLocationId: 'vista-creek-towers',
  debtAtTrigger: 25_000,
};
const muggingEncounter: PendingEncounter = {
  encounterId: 'mugging-modal-test',
  type: 'mugging',
  title: 'Cornered!',
  body: 'A couple of wolves step out from the stairwell. They clock the roll in your pocket before you clock the exit.',
  createdDay: 4,
  fromLocationId: 'velvet-heights',
  toLocationId: 'vista-creek-towers',
  cashAtTrigger: 4_000,
};
const policeEncounter: PendingEncounter = {
  encounterId: 'police-modal-test',
  type: 'police-chase',
  title: 'Red and Blue!',
  body:
    'Officer Hardass rolls up hot. The badge is out, the cuffs are ready, and your pockets are the whole case.',
  createdDay: 4,
  fromLocationId: 'velvet-heights',
  toLocationId: 'vista-creek-towers',
  cashAtTrigger: 4_000,
  deputyCount: 2,
  officersRemaining: 3,
  officersDefeated: 0,
  round: 1,
  lastRoundSummary: 'Glock 19 dropped one officer. 3 still on you.',
};

function renderModal(
  overrides: Partial<React.ComponentProps<typeof EncounterModal>> = {},
) {
  return render(
    React.createElement(EncounterModal, {
      pendingEncounter,
      cash: 4_000,
      debt: 25_000,
      dopeCarried: 6,
      equippedWeaponStats: null,
      health: 75,
      onHandItOver: jest.fn(),
      onSurrender: jest.fn(),
      onRun: jest.fn(),
      onFight: jest.fn(),
      ...overrides,
    }),
  );
}

describe('EncounterModal', () => {
  it('renders nothing without a pending encounter', () => {
    const { toJSON } = renderModal({ pendingEncounter: null });

    expect(toJSON()).toBeNull();
  });

  it('renders Big Sal dialogue and pressure stats', () => {
    const { getByText, queryByText } = renderModal();

    expect(getByText('Blocked!')).toBeTruthy();
    expect(getByText(pendingEncounter.body)).toBeTruthy();
    expect(getByText('No deals. No walking away.')).toBeTruthy();
    expect(getByText('Cash on hand')).toBeTruthy();
    expect(getByText('Outstanding debt')).toBeTruthy();
    expect(getByText('$4,000')).toBeTruthy();
    expect(getByText('$25,000')).toBeTruthy();
    expect(getByText('Hand it over')).toBeTruthy();
    expect(getByText('Run')).toBeTruthy();
    expect(queryByText('Surrender')).toBeNull();
    expect(queryByText(/Fight/)).toBeNull();
  });

  it('renders mugging choices without fight when no weapon is equipped', () => {
    const { getByText, queryByText } = renderModal({
      pendingEncounter: muggingEncounter,
    });

    expect(getByText('Cornered!')).toBeTruthy();
    expect(getByText(muggingEncounter.body)).toBeTruthy();
    expect(getByText('Cash talks loud. So do guns.')).toBeTruthy();
    expect(getByText('Surrender')).toBeTruthy();
    expect(getByText('Run')).toBeTruthy();
    expect(queryByText('Hand it over')).toBeNull();
    expect(queryByText(/Fight/)).toBeNull();
  });

  it('renders mugging fight when a weapon is equipped', () => {
    const { getByText } = renderModal({
      pendingEncounter: muggingEncounter,
      equippedWeaponStats: {
        displayName: 'Glock 19',
        damage: 7,
        accuracy: 60,
      },
    });

    expect(getByText('Fight with Glock 19')).toBeTruthy();
  });

  it('renders police pressure stats and disabled fight when unarmed', () => {
    const { getByText, queryByText } = renderModal({
      pendingEncounter: policeEncounter,
    });

    expect(getByText('Officer Hardass')).toBeTruthy();
    expect(getByText('Red and Blue!')).toBeTruthy();
    expect(getByText(policeEncounter.body)).toBeTruthy();
    expect(getByText('Run clean or fight dirty.')).toBeTruthy();
    expect(getByText(policeEncounter.lastRoundSummary ?? '')).toBeTruthy();
    expect(getByText('Dope carried')).toBeTruthy();
    expect(getByText('Police remaining')).toBeTruthy();
    expect(getByText('6')).toBeTruthy();
    expect(getByText('3')).toBeTruthy();
    expect(getByText('No weapon equipped')).toBeTruthy();
    expect(getByText('Run')).toBeTruthy();
    expect(queryByText('Hand it over')).toBeNull();
    expect(queryByText('Surrender')).toBeNull();
  });

  it('renders police fight when a weapon is equipped', () => {
    const { getByText } = renderModal({
      pendingEncounter: policeEncounter,
      equippedWeaponStats: {
        displayName: 'Draco',
        damage: 11,
        accuracy: 55,
      },
    });

    expect(getByText('Fight with Draco')).toBeTruthy();
  });

  it('forces an encounter choice without cancel controls', () => {
    const { queryByText } = renderModal();

    expect(queryByText('Cancel')).toBeNull();
    expect(queryByText('Close')).toBeNull();
    expect(queryByText('Stay')).toBeNull();
  });

  it('calls hand-it-over handler once', () => {
    const onHandItOver = jest.fn();
    const { getByText } = renderModal({ onHandItOver });

    fireEvent.press(getByText('Hand it over'));

    expect(onHandItOver).toHaveBeenCalledTimes(1);
  });

  it('calls run handler once', () => {
    const onRun = jest.fn();
    const { getByText } = renderModal({ onRun });

    fireEvent.press(getByText('Run'));

    expect(onRun).toHaveBeenCalledTimes(1);
  });

  it('calls surrender and fight handlers once', () => {
    const onSurrender = jest.fn();
    const onFight = jest.fn();
    const { getByText } = renderModal({
      pendingEncounter: muggingEncounter,
      equippedWeaponStats: {
        displayName: 'Beretta',
        damage: 5,
        accuracy: 50,
      },
      onFight,
      onSurrender,
    });

    fireEvent.press(getByText('Surrender'));
    fireEvent.press(getByText('Fight with Beretta'));

    expect(onSurrender).toHaveBeenCalledTimes(1);
    expect(onFight).toHaveBeenCalledTimes(1);
  });
});
