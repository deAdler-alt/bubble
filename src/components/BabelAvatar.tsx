import { memo } from "react";

type BabelAvatarProps = {
  size: number;
  className?: string;
};

export const BabelAvatar = memo(function BabelAvatar({
  size,
  className = "",
}: BabelAvatarProps) {
  return (
    <div
      className={[
        "relative flex aspect-square items-center justify-center overflow-hidden rounded-full border-[6px] border-black",
        "bg-linear-to-br from-cyan-300 via-fuchsia-300 to-yellow-300",
        "shadow-[0_18px_0_rgba(0,0,0,0.55)]",
        className,
      ].join(" ")}
      style={{ width: size }}
      aria-label="Babel avatar"
      role="img"
    >
      <div className="absolute inset-0 bg-radial-[circle_at_30%_28%] from-white/80 via-white/20 to-transparent" />
      <span className="relative z-[1] text-[clamp(2.5rem,6vw,5rem)] leading-none">🤖</span>
    </div>
  );
});
