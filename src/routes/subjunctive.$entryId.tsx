import { createFileRoute, redirect } from "@tanstack/react-router";

/** Old links and bookmarks: /subjunctive/<id> now lives at /subjunctive/present/<id>. */
export const Route = createFileRoute("/subjunctive/$entryId")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/subjunctive/present/$entryId", params: { entryId: params.entryId }, statusCode: 301 });
  },
});
