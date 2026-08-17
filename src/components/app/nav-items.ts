import { Home, LayoutGrid, Search, Heart, Brain, BarChart3, Settings, MessagesSquare } from "lucide-react";

export const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/browse", label: "Browse", icon: LayoutGrid },
  { to: "/sayings", label: "Sayings", icon: MessagesSquare },
  { to: "/search", label: "Search", icon: Search },
  { to: "/favourites", label: "Favourites", icon: Heart },
  { to: "/quiz", label: "Quiz", icon: Brain },
  { to: "/statistics", label: "Statistics", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;
