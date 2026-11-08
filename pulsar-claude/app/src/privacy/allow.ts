/**
 * Contract of the privacy guard (spec 4.4 and F-1.06).
 *
 * While the global eye is closed, indicator names are hidden everywhere. The only exception is
 * content the person explicitly opened: the indicator editor (the real name inside the form
 * field) and an observation revealed on purpose. Those elements carry `data-privacy-allow`, and
 * the e2e guard (e2e/privacy-mode.spec.ts) ignores everything inside them.
 *
 * The attribute name lives here so the app and the guard cannot drift apart.
 */
export const PRIVACY_ALLOW_ATTRIBUTE = 'data-privacy-allow';

/** Props that mark an element as intentionally revealing the real indicator name. */
export function privacyAllowProps(): Record<string, string> {
  return { [PRIVACY_ALLOW_ATTRIBUTE]: 'true' };
}
