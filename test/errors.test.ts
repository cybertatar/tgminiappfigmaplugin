import { describe, expect, it, vi } from 'vitest';
import { userMessage, UserError } from '../src/main/errors';

describe('userMessage', () => {
  it('shows user errors as is and hides unexpected ones', () => {
    expect(userMessage(new UserError('Select one screen frame.'))).toBe('Select one screen frame.');
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const msg = userMessage(new Error('in deleteComponentProperty: Invalid component property name'));
    expect(msg).toMatch(/Something went wrong/);
    expect(msg).not.toMatch(/deleteComponentProperty/);
    expect(log).toHaveBeenCalled();
  });
});
