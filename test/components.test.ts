import { describe, expect, it } from 'vitest';
import { BAR_LAYOUTS, barArrangement, BOTTOM_BAR } from '../src/components/bottom-bar';
import { BUTTON_FONTS, pickFont } from '../src/components/fonts';
import { PLATFORMS } from '../src/core';

describe('bottom bar config', () => {
  it('maps every layout to a button order', () => {
    expect(barArrangement('Secondary left')).toEqual({ direction: 'HORIZONTAL', order: ['Secondary', 'Main'] });
    expect(barArrangement('Secondary bottom')).toEqual({ direction: 'VERTICAL', order: ['Main', 'Secondary'] });
    for (const l of BAR_LAYOUTS) expect(barArrangement(l).order.length).toBeGreaterThan(0);
  });

  it('has sane geometry for every platform', () => {
    for (const p of PLATFORMS) {
      const s = BOTTOM_BAR[p];
      expect(s.width - s.padding.left - s.padding.right).toBeGreaterThan(200);
      expect(s.radius * 2).toBeLessThanOrEqual(s.buttonHeight);
    }
  });
});

describe('pickFont', () => {
  it('takes the first available family and style spelling', () => {
    const available = new Set(['SF Pro|Semibold', 'Open Sans|SemiBold', 'Inter|Semi Bold']);
    expect(pickFont(BUTTON_FONTS.ios, available)).toEqual({ family: 'SF Pro', style: 'Semibold' });
    expect(pickFont(BUTTON_FONTS.desktop, available)).toEqual({ family: 'Open Sans', style: 'SemiBold' });
    expect(pickFont(BUTTON_FONTS.android, available)).toBeNull();
  });
});
