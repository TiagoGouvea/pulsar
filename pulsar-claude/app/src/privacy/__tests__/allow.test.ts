import { describe, expect, it } from 'vitest';
import { PRIVACY_ALLOW_ATTRIBUTE, privacyAllowProps } from '../allow';

describe('privacy allow contract', () => {
  it('marks intentionally revealed content with the attribute the e2e guard looks for', () => {
    expect(PRIVACY_ALLOW_ATTRIBUTE).toBe('data-privacy-allow');
    expect(privacyAllowProps()).toEqual({ 'data-privacy-allow': 'true' });
  });
});
