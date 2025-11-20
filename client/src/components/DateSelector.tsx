import React from "react";
import { cn } from "@/lib/utils";
import { addDays, format } from "date-fns";

export function DateSelector() {
  const today = new Date();
  const dates = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const [selected, setSelected] = React.useState(0);

  return (
    <div className="w-full overflow-x-auto pb-4 pt-2 no-scrollbar">
      <div className="flex gap-3 px-4">
        {dates.map((date, i) => {
          const isSelected = i === selected;
          return (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={cn(
                "flex min-w-[60px] flex-col items-center justify-center rounded-2xl border py-3 transition-all",
                isSelected 
                  ? "border-primary bg-primary text-primary-foreground shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)]" 
                  : "border-white/5 bg-card/50 text-muted-foreground hover:border-white/20 hover:bg-card"
              )}
            >
              <span className="text-[10px] font-medium uppercase opacity-60">
                {format(date, "EEE")}
              </span>
              <span className={cn(
                "text-xl font-bold font-mono",
                isSelected ? "text-primary-foreground" : "text-foreground"
              )}>
                {format(date, "d")}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
