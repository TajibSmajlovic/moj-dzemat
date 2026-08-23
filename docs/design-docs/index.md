# Design Documents

This index records durable repository decisions and points to the document that
owns each one. Add a design document when a decision constrains future changes
and its reasoning cannot be recovered reliably from code alone.

| Decision area                                   | Authoritative document                                   | Why it matters                                                    |
| ----------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------- |
| Engineering beliefs                             | [Core beliefs](core-beliefs.md)                          | Defines the recurring tradeoffs agents should preserve.           |
| System and domain ownership                     | [Architecture](../../ARCHITECTURE.md)                    | Defines runtime boundaries and state ownership.                   |
| Import direction                                | [Architecture boundaries](../architecture/boundaries.md) | Defines mechanically enforced dependency rules.                   |
| Public post offline storage and worker recovery | [PWA runtime and recovery](pwa-runtime-and-recovery.md)  | Defines the privacy boundary and emergency replacement procedure. |
| Durable first-publication notification delivery | [Web Push](web-push.md)                                  | Defines privacy, retry, key rotation, and rollback behavior.      |

## Adding a decision

A new record should state the context, decision, consequences, alternatives
rejected, and evidence that the implementation matches it. Link the record here
and from the architecture, product, security, or reliability owner that depends
on it. Do not create a record for a local implementation detail or a decision
that has not been made.
