/** Logo del progetto: sfera azzurra originale (nessun asset ufficiale). */
export function LogoMark({ size = 48 }: { size?: number }) {
  const inner = Math.round(size * 0.67);
  const shine = Math.round(inner * 0.26);
  return (
    <span
      aria-hidden="true"
      className="grid flex-none place-items-center rounded-full border-[3px] border-edge bg-white"
      style={{ width: size, height: size }}
    >
      <span
        className="relative block rounded-full border-2 border-edge bg-[#3fa9f5]"
        style={{ width: inner, height: inner }}
      >
        <span
          className="absolute block rounded-full bg-white opacity-85"
          style={{
            top: Math.round(inner * 0.16),
            left: Math.round(inner * 0.19),
            width: shine,
            height: shine,
          }}
        />
      </span>
    </span>
  );
}
