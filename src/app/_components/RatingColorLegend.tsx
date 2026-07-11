import { RATING_COLOR_TIERS } from "@/lib/rating";
import { cn } from "@/lib/utils";

export function RatingColorLegend() {
  const tiers = [...RATING_COLOR_TIERS].reverse();

  return (
    <div className="grid grid-cols-1 gap-4 text-center sm:grid-cols-2 md:grid-cols-3">
      {tiers.map((tier) => (
        <div
          key={tier.label}
          className="flex flex-col items-center rounded-md border p-3"
        >
          <span
            className={cn(
              tier.colorClass,
              tier.colorClass.includes("gradient") &&
                "bg-clip-text text-transparent",
            )}
          >
            {tier.label}
          </span>
          <span className="text-xs text-muted-foreground">{tier.rangeLabel}</span>
        </div>
      ))}
    </div>
  );
}
