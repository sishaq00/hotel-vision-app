// Light/dark theme toggle. Persists to localStorage and applies `dark` class on <html>.
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "nexora.theme";

function applyTheme(theme: "light" | "dark") {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    const saved = (localStorage.getItem(STORAGE_KEY) as "light" | "dark" | null);
    const initial: "light" | "dark" =
      saved ?? (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(initial);
    applyTheme(initial);
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  // Render a stable placeholder during SSR to avoid hydration mismatch.
  if (theme === null) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 rounded p-0 text-muted-foreground"
        aria-label="Toggle theme"
      >
        <span className="block h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 w-8 rounded p-0 text-muted-foreground"
      onClick={toggle}
      title={theme === "dark" ? "Switch to light" : "Switch to dark"}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
