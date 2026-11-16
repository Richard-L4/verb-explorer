/** Navigation data shared by AppShell's desktop and mobile menus. Keeping destinations, labels and icon components together prevents the two menus from drifting apart. */
import { Home, LayoutGrid, Search, Heart, BarChart3, Settings, MessagesSquare, Sparkles, Brain, ShoppingBag } from "lucide-react";

export const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/browse", label: "Browse", icon: LayoutGrid },
  { to: "/subjunctive", label: "Subjunctive", icon: Sparkles },
  { to: "/quiz", label: "Quiz", icon: Brain },
  { to: "/sayings", label: "Sayings", icon: MessagesSquare },
  { to: "/search", label: "Search", icon: Search },
  { to: "/favourites", label: "Favourites", more: true, icon: Heart },
  { to: "/statistics", label: "Statistics", more: true, icon: BarChart3 },
  { to: "/settings", label: "Settings", more: true, icon: Settings },
] as const;

/** Highlighted purchase link shown in both menus; it opens the existing Unlock page. */
export const buyItem = { to: "/unlock", label: "Buy It Now", icon: ShoppingBag } as const;
