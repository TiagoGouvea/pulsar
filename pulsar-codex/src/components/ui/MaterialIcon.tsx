import React from 'react';
import clsx from 'clsx';

/**
 * Names available in the Material Symbols Outlined font used by the design.
 *
 * The list is explicit on purpose: when a name does not exist in the font the
 * browser does not substitute the ligature and prints the raw text instead of
 * the icon, which breaks the layout of the surrounding chip. Keeping the names
 * typed turns that mistake into a compile-time error.
 */
export const MATERIAL_SYMBOL_NAMES = [
  'add',
  'add_circle',
  'arrow_back',
  'arrow_forward',
  'auto_awesome',
  'bedtime',
  'bolt',
  'check_circle',
  'coffee',
  'fitness_center',
  'flash_on',
  'healing',
  'hourglass_top',
  'insights',
  'lock',
  'magic_button',
  'manage_accounts',
  'medication',
  'mood',
  'no_accounts',
  'person',
  'psychology',
  'remove',
  'schedule',
  'science',
  'touch_app',
  'verified_user',
  'visibility',
  'visibility_off'
] as const;

export type MaterialIconName = (typeof MATERIAL_SYMBOL_NAMES)[number];

interface MaterialIconProps {
  name: MaterialIconName;
  /** Rendered size in pixels; the icon keeps a 1:1 box with the glyph. */
  size?: number;
  className?: string;
  /** Accessible name; when omitted the icon is treated as decorative. */
  label?: string;
}

export const MaterialIcon: React.FC<MaterialIconProps> = ({ name, size = 24, className, label }) => (
  <span
    className={clsx('material-symbols-outlined', className)}
    style={{ fontSize: `${size}px`, lineHeight: 1 }}
    role={label ? 'img' : undefined}
    aria-hidden={label ? undefined : true}
    aria-label={label}
  >
    {name}
  </span>
);

export default MaterialIcon;
