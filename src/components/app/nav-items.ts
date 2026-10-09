import { Home, LayoutGrid, Search, Heart, BarChart3, Settings, MessagesSquare, Sparkles } from "lucide-react";

export const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/browse", label: "Browse", icon: LayoutGrid },
  { to: "/subjunctive", label: "Subjunctive", icon: Sparkles },
  { to: "/sayings", label: "Sayings", icon: MessagesSquare, Sparkles },
  { to: "/search", label: "Search", icon: Search },
  { to: "/favourites", label: "Favourites", icon: Heart },
  { to: "/statistics", label: "Statistics", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;
