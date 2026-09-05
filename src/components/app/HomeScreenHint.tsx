import { useEffect, useState } from "react";
import { isIos, isStandalone } from "@/lib/install-prompt";

export function HomeScreenHint({ className }: { className?: string }) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    if (isStandalone()) return;
    const touch = isIos() || (navigator.maxTouchPoints ?? 0) > 1;
    setText(
      touch
        ? "Add Verb Wise to your home screen for instant access."
        : "Bookmark Verb Wise for instant access.",
    );
  }, []);

  if (!text) return null;
  return <p className={className}>{text}</p>;
}
