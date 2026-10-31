/** Google "G" mark used by the account conversion CTAs in the official design. */
export function GoogleIcon({ className = 'h-4 w-4 shrink-0' }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12.24 10.285V13.4h6.887C18.2 16.037 15.65 18 12.24 18c-3.61 0-6.54-2.93-6.54-6.54s2.93-6.54 6.54-6.54c1.65 0 3.16.61 4.33 1.62l2.35-2.35C17.15 2.57 14.86 1.8 12.24 1.8 6.54 1.8 2 6.34 2 12s4.54 10.2 10.24 10.2c5.96 0 9.87-4.19 9.87-10.05 0-.67-.06-1.32-.17-1.865H12.24z" />
    </svg>
  );
}

export default GoogleIcon;
