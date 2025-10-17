/* Imports */
import { memo, type JSX } from "react";

/* Relative Imports */
import { Sun, Moon, MonitorSmartphone, CircleDot, Circle } from "lucide-react";

/* Local Imports */
import useThemeSettings from "@/hooks/useThemeSettings";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Theme } from "@/context/themeContext";

// ----------------------------------------------------------------------

const ThemeModeSetting = (): JSX.Element => {
  const { themeMode, setTheme } = useThemeSettings();

  const menuItems = [
    {
      label: "Light",
      icon: Sun,
      value: "light",
    },
    {
      label: "Dark",
      icon: Moon,
      value: "dark",
    },
    {
      label: "System",
      icon: MonitorSmartphone,
      value: "system",
    },
  ];

  return (
    <div className="fixed bottom-8 right-8 z-50">
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="transition-all hover:scale-105 shadow-md bg-background/80 backdrop-blur dark:bg-muted"
              >
                {themeMode === "light" ? (
                  <Sun className="h-[1.3rem] w-[1.3rem] text-yellow-500" />
                ) : themeMode === "dark" ? (
                  <Moon className="h-[1.3rem] w-[1.3rem] text-indigo-500" />
                ) : (
                  <MonitorSmartphone className="h-[1.3rem] w-[1.3rem] text-muted-foreground" />
                )}
                <span className="sr-only">Toggle theme</span>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Change Theme</p>
          </TooltipContent>
        </Tooltip>

        <DropdownMenuContent
          align="end"
          className="w-40 p-1 rounded-xl shadow-xl"
        >
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <DropdownMenuItem
                key={item.value}
                onClick={() => setTheme(item.value as Theme)}
                className={cn(
                  "flex items-center justify-between gap-2 p-2 rounded-md cursor-pointer transition-all hover:bg-muted",
                  themeMode === item.value && "bg-muted font-semibold"
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  {item.label}
                </div>
                {themeMode === item.value ? (
                  <CircleDot className="w-4 h-4 text-primary" />
                ) : (
                  <Circle className="w-4 h-4 text-muted-foreground" />
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default memo(ThemeModeSetting);
