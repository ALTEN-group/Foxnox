# Security Questions

Security questions exist for exactly one purpose in Foxnox: proving identity during [lost 2FA recovery](./workflow-account-recover). They are not an alternative way to sign in, and they are never asked during a normal login.

This is a self-service settings page and requires an existing session.

## Pages

| Page | Path | Protected | Purpose |
|---|---|---|---|
| Setup | `GET/POST /security-questions` | ✅ | Choose questions and provide answers |
| Done | after `POST` | ✅ | Answers saved |

## Enrolling

The page offers a catalog of questions loaded from the database, localized to the user's language, and asks for **three** question-and-answer pairs. All three must be different questions drawn from the catalog, and every one needs a non-empty answer.

Anything less comes back with `Select a question and provide an answer for each row.` The check is strict on purpose: recovery asks for all enrolled questions, so a partial enrollment would produce a challenge that cannot be satisfied.

Answers are hashed before storage. Neither an administrator nor a database dump reveals them, which also means a user who forgets their answers cannot be reminded — only re-enrolled.

## Why the Catalog Is in the Database

Questions live in `security_question` with translations in `security_question_trans`, rather than being hard-coded. Two things follow from that: you can adapt the question set to your audience without a deploy, and each question is presented in the user's language while still being identified by a stable numeric ID.

That ID stability is what lets recovery match an answer given in French today against one enrolled in English last year.

## Recommended Placement

Prompt for security questions **at the same time** the user enables 2FA. A user who turns on 2FA without enrolling questions has no self-service recovery path at all — losing their phone becomes a support ticket that only an administrator can close.

```
/api/pwd/web/security-questions
```

## Re-enrolling

Submitting the form again replaces the stored answers. There is no separate edit flow, and no need for one: the page always starts from empty slots, so re-enrollment is the same three-question form.
