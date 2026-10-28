import type { IconName } from "./nav";

const PATHS: Record<IconName, React.ReactNode> = {
  box: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
    </>
  ),
  trainer: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </>
  ),
  dex: <path d="M5 3.5h11a3 3 0 0 1 3 3v14H8a3 3 0 0 1-3-3z M5 17.5a3 3 0 0 1 3-3h11" />,
  move: <path d="M13 2L4 14h7l-1 8 9-12h-7z" />,
  item: <path d="M5 8h14v12H5z M9 8V5h6v3 M5 13h14" />,
  fanmade: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />,
  campaign: <path d="M4 5h16v14H4z M4 9h16 M9 9v10" />,
  more: (
    <>
      <circle cx="5" cy="12" r="2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="2" fill="currentColor" stroke="none" />
    </>
  ),
  logout: <path d="M15 4h4v16h-4 M10 8l-4 4 4 4 M6 12h10" />,
};

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
