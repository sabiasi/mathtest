In a **code review**, another developer reads your changes before they're merged, usually in a [pull request](/roadmap/github). On professional teams, almost every change gets reviewed.

## Why teams do it

- **Catch bugs early**, while they're cheap to fix.
- **Share knowledge**: more than one person understands every part of the code.
- **Keep the codebase consistent**, and help everyone (including seniors) learn.

## What reviewers look for

1. **Does it work?** Is the logic correct? Are edge cases handled?
2. **Is it clear?** Good names, small functions, no confusing tricks ([Clean code](/roadmap/clean-code)).
3. **Is it tested?** Are there [tests](/roadmap/testing) for the new behavior?
4. **Is it safe?** No secrets in the code, user input handled carefully.

## Giving feedback well

- Comment on the **code, not the person**: "This loop could miss the last item", not "You forgot…".
- **Ask questions**: "What happens if the list is empty?" helps people think.
- **Explain why**, and label small things as optional: "nit: maybe `user_count`?"
- **Praise good work** too.

## Receiving feedback well

- It's about the code, not your worth. Every developer gets review comments, forever.
- Say thanks, ask when you don't understand, and push back politely if you disagree, with reasons.
- Keep pull requests **small**: they're reviewed faster and better.

## Try it

DevPath's **Code Reflection** tool (Phase 3) gives you beginner-friendly review questions about your own code. Meanwhile, re-read code you wrote last week as if a stranger wrote it. What would you comment on?

## Key takeaways

- A code review is a second pair of eyes before code is merged.
- Check correctness, clarity, tests and safety.
- Be kind and specific when giving feedback; stay curious when receiving it.
