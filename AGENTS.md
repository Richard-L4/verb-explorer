<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Content access policy lives only in `src/lib/content-access.ts`; pages call it instead of writing their own rules, so the policy stays consistent.
- `src/data/subjunctive.json` is imported only by `src/lib/subjunctive-full.server.ts`, which is loaded dynamically inside server handlers; the browser uses the generated `subjunctive.public.json` (regenerate with `bun ./scripts/build-subjunctive-public.ts`), so locked examples never ship to the client.
- Paid subjunctive content is released only for a server-signed purchase pass (`content-pass.server.ts`) whose purchase is re-checked in the database; the local `unlocked` flag never authorises protected content.
- Creator mode is server-validated: `?creator=` is stripped from the URL and checked against the server-only `CREATOR_ACCESS_KEY` (`creator.functions.ts`), which issues a 30-day creator pass bound to a key fingerprint; never put a creator code in client code.
- Restore by email requires a one-time emailed code (`restore.server.ts`, table `restore_codes`); only HMACs of emails, codes and networks are stored, and replies never reveal purchase status.
