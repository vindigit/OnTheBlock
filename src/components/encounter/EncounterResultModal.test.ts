import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { EncounterResultModal } from './EncounterResultModal';

function renderModal(
  overrides: Partial<React.ComponentProps<typeof EncounterResultModal>> = {},
) {
  return render(
    React.createElement(EncounterResultModal, {
      visible: true,
      title: 'Shakedown!',
      body: 'Officer Hardass tossed your stash. You lost $5,000 and 6 units of dope.',
      onDismiss: jest.fn(),
      ...overrides,
    }),
  );
}

describe('EncounterResultModal', () => {
  it('renders nothing when hidden', () => {
    const { toJSON } = renderModal({ visible: false });

    expect(toJSON()).toBeNull();
  });

  it('renders result copy and dismisses once', () => {
    const onDismiss = jest.fn();
    const { getByText } = renderModal({ onDismiss });

    expect(getByText('Shakedown!')).toBeTruthy();
    expect(
      getByText(
        'Officer Hardass tossed your stash. You lost $5,000 and 6 units of dope.',
      ),
    ).toBeTruthy();

    fireEvent.press(getByText('Keep moving'));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
