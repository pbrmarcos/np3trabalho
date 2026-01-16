import { useTheme } from "@/contexts/ThemeContext";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
}

export default function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme, switchable } = useTheme();

  if (!switchable || !toggleTheme) return null;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Switch
        id="theme-toggle"
        checked={theme === "light"}
        onCheckedChange={toggleTheme}
        aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
      />
      <Label 
        htmlFor="theme-toggle" 
        className="text-sm cursor-pointer whitespace-nowrap"
      >
        Ativar modo claro
      </Label>
    </div>
  );
}
