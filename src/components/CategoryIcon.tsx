import { categoryLabel, primaryCategory } from "@/lib/rules";
import { typeStyle } from "./TypeBadge";

const PATHS = {
  Physical: "M12 2l2.4 6.1L21 7l-4.2 5L21 17l-6.6-1.1L12 22l-2.4-6.1L3 17l4.2-5L3 7l6.6 1.1z",
  Special: "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zm0 5a4 4 0 1 0 0 8a4 4 0 1 0 0-8z",
  Support: "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zm0 3a6 6 0 0 0 0 12z",
};

/** Quadratino col colore del tipo e il simbolo della categoria (fisica/speciale/supporto). */
export function CategoryIcon({
  category,
  type,
  size = 28,
}: {
  category: string;
  type: string;
  size?: number;
}) {
  return (
    <span
      className="tb flex-none justify-center p-0"
      style={{ ...typeStyle(type), width: size, height: size, borderRadius: 8 }}
      title={categoryLabel(category)}
    >
      <svg width={size * 0.54} height={size * 0.54} viewBox="0 0 24 24" aria-hidden="true">
        <path d={PATHS[primaryCategory(category)]} fill="currentColor" fillRule="evenodd" />
      </svg>
      <span className="sr-only">{categoryLabel(category)}</span>
    </span>
  );
}
