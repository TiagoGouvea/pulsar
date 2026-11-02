/**
 * Pulsar brand mark: dark rounded square with the pulse glyph, used in the app header
 * before the "Pulsar" wordmark, as in the design header mockup.
 */
export function BrandMark({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-on-surface ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-5 text-surface"
      >
        <path d="M2 13h4l2-6 3 10 3-8 2 4h6" />
      </svg>
    </span>
  );
}
