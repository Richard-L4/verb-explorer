import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import type { Tense } from "@/data/subjunctive-tense";

/** Link to one subjunctive entry in the given tense. */
export function SubjunctiveEntryLink({
  tense,
  entryId,
  className,
  children,
}: {
  tense: Tense;
  entryId: string;
  className?: string;
  children: ReactNode;
}) {
  return tense === "imperfect" ? (
    <Link to="/subjunctive/imperfect/$entryId" params={{ entryId }} className={className}>
      {children}
    </Link>
  ) : (
    <Link to="/subjunctive/present/$entryId" params={{ entryId }} className={className}>
      {children}
    </Link>
  );
}

/** Link to the list page of a tense. */
export function SubjunctiveTenseLink({
  tense,
  className,
  children,
}: {
  tense: Tense;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link to={tense === "imperfect" ? "/subjunctive/imperfect" : "/subjunctive/present"} className={className}>
      {children}
    </Link>
  );
}
