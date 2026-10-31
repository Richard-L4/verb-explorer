/*
 * Compatibility route for old /subjunctive/<entryId> bookmarks.
 * Redirects to subjunctive.present.$entryId.tsx before rendering, preserving the ID
 * without duplicating the present-tense page or its access decisions.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

/** Old links and bookmarks: /subjunctive/<id> now lives at /subjunctive/present/<id>. */
// createFileRoute connects this filename to its URL in the generated route tree.
export const Route = createFileRoute("/subjunctive/$entryId")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/subjunctive/present/$entryId", params: { entryId: params.entryId }, statusCode: 301 });
  },
});
