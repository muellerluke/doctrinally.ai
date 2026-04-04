"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";

const options = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
  { value: "system", icon: Monitor, label: "System" },
] as const;

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Render a static placeholder on the server to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="flex items-center gap-0.5 rounded-lg border bg-muted/50 p-0.5">
        {options.map(({ value, icon: Icon, label }) => (
          <div
            key={value}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-muted-foreground"
          >
            <Icon className="h-3 w-3" />
            <span className="hidden sm:inline">{label}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0.5 rounded-lg border bg-muted/50 p-0.5">
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors ${
            theme === value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
          title={label}
        >
          <Icon className="h-3 w-3" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
