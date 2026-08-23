# Product Sense

Moj Džemat helps a local džemat publish trustworthy information without asking
community members to create accounts or learn a complex product. It should feel
like a calm, current community noticeboard that works especially well on a
phone.

## People served

- Community members read posts, answered questions, important dates, and
  contact information.
- Visitors can submit a question without providing a name or email address.
- A small group of trusted editors maintains all public content through the
  authenticated admin area.

The public reader is the primary user. Editor efficiency matters because an
editor may use the admin area infrequently and should not need product training.

## Product priorities

1. **Trustworthy information.** Public content must clearly reflect its current
   publication and moderation state. Drafts, hidden answers, and admin-only data
   never appear publicly.
2. **Immediate comprehension.** The newest and most important information should
   be easy to scan. Labels, dates, empty states, and actions use clear Bosnian
   language.
3. **Respectful privacy.** Collect the minimum data needed for a feature. The Q&A
   form intentionally accepts only question text, and Web Push does not track
   opens or engagement.
4. **Reliable access.** Core reading works with server-rendered HTML. PWA,
   animations, sharing, theme, and notifications enhance that baseline.
5. **Operational simplicity.** One small service and one SQLite database are a
   deliberate fit for the current community scale. Assumptions that prevent
   horizontal scaling must stay explicit.

## Product decision test

Before adding behavior, answer these questions:

- Does it help a visitor find or understand current community information?
- Does it reduce editor effort without making publication state less clear?
- What new personal or sensitive data would it collect, retain, or expose?
- Does the essential path still work without optional browser capabilities?
- Can the current single-service deployment operate and recover it safely?
- What visible behavior and failure state will prove it works?

## Non-goals

- Public accounts, profiles, reactions, comments, or social feeds.
- Engagement analytics for questions or push notifications.
- A general-purpose multi-tenant CMS.
- Offline copies of admin, contact, donation, or other sensitive information.
- Infrastructure complexity without an observed reliability or scale need.

## Authoritative detail

- Product behavior: [product specifications](product-specs/index.md)
- Visual and interaction intent: [DESIGN.md](DESIGN.md)
- Data and trust boundaries: [SECURITY.md](SECURITY.md)
- Operational assumptions: [RELIABILITY.md](RELIABILITY.md)
