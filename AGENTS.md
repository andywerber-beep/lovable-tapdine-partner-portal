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

- Keep Partner Portal presentation in the shared teal-and-gold tokens in `src/styles.css` while leaving venue/offer persistence unchanged; this keeps the Launchpad-aligned brand separate from business logic.
- TapDine payments (transactions/partners) live in the separate TapDine database; the portal reaches them only via server functions in src/lib/passes.functions.ts that validate the TapDine login token and partners.user_id first — customers must never write there.
