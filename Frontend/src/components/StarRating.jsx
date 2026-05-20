import { Star } from "lucide-react";

const clampRating = (n) => Math.max(0, Math.min(5, Number(n) || 0));

export const StarRating = ({ value = 0, onChange, size = 16, readOnly = false, className = "" }) => {
  const rating = clampRating(value);
  const rounded = Math.round(rating);

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      {Array.from({ length: 5 }).map((_, idx) => {
        const i = idx + 1;
        const filled = i <= rounded;

        const base = `text-amber-500 ${readOnly ? "" : "hover:scale-105"}`;
        const icon = (
          <Star
            width={size}
            height={size}
            className={base}
            fill={filled ? "currentColor" : "none"}
          />
        );

        if (readOnly || typeof onChange !== "function") {
          return <span key={i}>{icon}</span>;
        }

        return (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i)}
            className="p-0.5 transition-transform"
            aria-label={`Rate ${i} star${i === 1 ? "" : "s"}`}
          >
            {icon}
          </button>
        );
      })}
    </div>
  );
};
