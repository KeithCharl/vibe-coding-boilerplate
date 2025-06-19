"use client";

import * as React from "react";
import { Moon, Sun, Monitor, Check, Palette } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export function ThemeSettings() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const themes = [
    {
      id: "light",
      name: "Light Mode",
      description: "Clean and bright interface for daytime use",
      icon: Sun,
      preview: "from-slate-50 to-white",
      textColor: "text-slate-900",
      borderColor: "border-slate-200",
    },
    {
      id: "dark",
      name: "Dark Mode", 
      description: "Comfortable dark interface for low-light environments",
      icon: Moon,
      preview: "from-slate-900 to-slate-800",
      textColor: "text-slate-100",
      borderColor: "border-slate-700",
    },
    {
      id: "system",
      name: "Auto Mode",
      description: "Automatically switch based on your system preference",
      icon: Monitor,
      preview: "from-slate-300 to-slate-600",
      textColor: "text-slate-900",
      borderColor: "border-slate-400",
    },
  ];

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon">
        <Palette className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Palette className="h-4 w-4" />
          <span className="sr-only">Theme settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Appearance Settings
          </DialogTitle>
          <DialogDescription>
            Choose your preferred theme for the best viewing experience
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3">
          {themes.map((themeOption) => {
            const Icon = themeOption.icon;
            const isSelected = theme === themeOption.id;
            
            return (
              <Card
                key={themeOption.id}
                className={`cursor-pointer transition-all duration-200 ${
                  isSelected 
                    ? "ring-2 ring-primary bg-primary/5" 
                    : "hover:bg-accent/50"
                }`}
                onClick={() => setTheme(themeOption.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 bg-gradient-to-br ${themeOption.preview} rounded-lg border ${themeOption.borderColor} flex items-center justify-center`}>
                        <Icon className={`h-4 w-4 ${themeOption.textColor}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{themeOption.name}</h3>
                          {isSelected && (
                            <Badge variant="secondary" className="text-xs">
                              <Check className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {themeOption.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground">
            Your theme preference will be remembered across sessions. The system theme option 
            will automatically switch between light and dark based on your operating system settings.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
} 