"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SliderProps {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  className?: string;
  disabled?: boolean;
}

function Slider({
  min,
  max,
  step,
  value,
  onChange,
  className,
  disabled,
}: SliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className={cn("relative flex w-full touch-none select-none items-center", className)}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className={cn(
          "h-2 w-full cursor-pointer appearance-none rounded-full bg-muted outline-none transition-opacity",
          "disabled:cursor-not-allowed disabled:opacity-50",
          // Webkit (Chrome, Safari, Edge)
          "[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5",
          "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full",
          "[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary",
          "[&::-webkit-slider-thumb]:bg-background [&::-webkit-slider-thumb]:shadow-sm",
          "[&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110",
          // Firefox
          "[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5",
          "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2",
          "[&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:bg-background",
          "[&::-moz-range-thumb]:shadow-sm",
        )}
        style={{
          background: `linear-gradient(to right, hsl(var(--primary)) ${percentage}%, hsl(var(--muted)) ${percentage}%)`,
        }}
      />
    </div>
  );
}

export { Slider };
export type { SliderProps };
