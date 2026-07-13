import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FormField } from '@/components/create/FormField';

// Voice input is env-gated behind FEATURES.voiceInput, which is evaluated at
// module-load time — so flipping process.env inside the test is too late once
// FormField (and config/features) are already imported. Mock the flag ON so the
// voice-integration path is exercised regardless of the deployment default.
jest.mock('@/config/features', () => ({ FEATURES: { voiceInput: true } }));

jest.mock('@/components/ui/DictationButton', () => ({
  __esModule: true,
  DictationButton: ({ onTranscript }: { onTranscript: (t: string) => void }) => (
    <button onClick={() => onTranscript('voice-data')} aria-label="Voice input for Description">
      Voice
    </button>
  ),
  default: () => null,
}));

describe('FormField voice integration', () => {
  it('appends voice transcript to textarea', () => {
    const onChange = jest.fn();
    render(
      <FormField
        config={{ name: 'description', label: 'Description', type: 'textarea' } as any}
        value={''}
        error={undefined}
        onChange={val => onChange(val)}
        onFocus={() => {}}
        disabled={false}
      />
    );
    const btn = screen.getByRole('button', { name: /voice input for description/i });
    fireEvent.click(btn);
    expect(onChange).toHaveBeenCalledWith('voice-data');
  });
});
