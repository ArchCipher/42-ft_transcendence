# Database Schema — Working Draft

**Stack:** Hocuspocus / Tiptap / Yjs · PostgreSQL · Prisma
**Status:** for discussion — nothing here is committed

---

## Summary

We have a working picture of the schema: **21 tables** across auth, tenancy, documents, permissions and collaboration. The auth layer builds on the input gathered from the team and is kept as designed — it's solid, and none of the questions below touch it.

**One decision blocks implementation:** how granular document permissions need to be (§1.1). It shapes the contract the auth layer has to honour, and it's the one thing that can't be retrofitted cheaply.

**Everything else can start now.** The auth tables and document persistence are settled and independent of the discussion below.

§1 is what needs answering — it should be readable on its own. §2 is the table inventory behind it.

| | Meaning |
|---|---|
| 🔴 | Blocking — nothing ships before we answer |
| 🟡 | To discuss — the schema changes depending on the answer |
| 🟢 | Settled — implementable as-is |
| ⚪ | Optional — addable later without breaking anything |

> ⚙️ Blocks marked like this are implementation notes. Skippable if you're reading for the product decisions.

---

## 1. Decisions

### 1.1 🔴 Permission granularity

Today a document is either private or open to the whole org, in edit mode. Three cases that model can't express:

1. Share read-only
2. Share with Alice and Bob, not the whole org
3. Let someone comment without editing

**Do any of these need to exist in v0?** If yes, a `documentShares` table ships now — it's the hardest thing to retrofit, since it changes every permission check. If no, the current model is a defensible choice, as long as it's a choice rather than an omission.

Public links — sharing with people who have no account — are the same question extended one step further. Additive, so they can wait.

### 1.2 🟡 What a snapshot stores

Two ways to store a version, with opposite trade-offs.

**A — `Y.snapshot()`** is a pointer into the document's own history. Tiny, and Tiptap renders "what changed" views from it natively. But it forces `gc: false` on the live document forever, so that document keeps every deleted character for life and grows much larger than its visible content. And if the live document breaks, every snapshot pointing into it dies with it.

**B — `Y.encodeStateAsUpdate()`** is a full independent copy. Restorable and exportable on its own, and lets the live document stay small. Costs one document's worth per snapshot: a 50 KB doc saved every 10 min over a working day is ~2.4 MB. Showing what changed needs extra work.

**Recommendation: B.** A doesn't save space, it moves it — out of the snapshot table and into the live document, which is loaded every time someone opens the file. A can be added later if we want richer diffs.

> ⚙️ The `gc` flag should be settled before the first production write: documents written with `gc: true` can never support A retroactively.

### 1.3 🟡 Comments — Y.Doc or SQL

Not whether we have them, but where they live. Inside the document, anchors move with the text for free but nothing is queryable — no notifications, no "my mentions", no moderation. In SQL, everything is queryable but anchors need maintaining as the text moves.

**Recommendation: anchors in the Y.Doc, thread and body in SQL**, joined by an `anchorId` — at the cost of keeping the two in sync on delete.

### 1.4 🟡 Account deletion

Deleting an account has to clean up friends, memberships and documents. The risky part: if an org owner leaves and we delete their org, everyone else's documents go with it.

**Recommendation: soft-delete and anonymise** — keep the row, null the personal fields, revoke sessions. Simpler than blocking deletion until ownership is transferred, and it preserves comments, snapshots and activity log, which all reference the user. GDPR asks for erasure of personal data, not of authored content.

### 1.5 🟡 Private documents

**Does a member keep a personal space inside an org, and does it survive them leaving?**

The answer changes how privacy is stored. If private documents die with the membership, the row has to record which org's membership it depends on — so `orgId` becomes mandatory and privacy moves into a separate `visibility` field. If they survive, a document with no org works as-is.

Related: can a user with no org create documents at all? The usual answer is a personal org created at signup.

### 1.6 🟡 Notification content

A notification can be stored two ways: as a finished sentence ("Marie shared a document with you"), or as the ingredients needed to build it (who, what, which document).

The finished sentence can't be translated — it's one opaque string, so a French user still reads English. It also goes stale: if Marie renames herself, old notifications keep the old name.

**Recommendation: store the ingredients, build the sentence in the UI.** Wording then lives in the translation files, and names stay current.

### 1.7 🟡 Snapshot interval

**5, 10 or 15 minutes of activity?** Plus a manual "save this version" action, and one automatic snapshot on close.

Retention: last 50 autosaves per document, all manual versions kept indefinitely.

### 1.8 ⚪ Teams

Sub-groups inside an org — useful for sharing with several people at once and filtering views. Fully additive, and only useful once sharing exists, so downstream of §1.1.

**Any org large enough at launch that per-person sharing hurts?** If not, easy to skip for now.

### 1.9 ⚪ Folders

The group appears to lean against, so this is here for completeness.

Cheap version: a tree, drag-reorder, a cycle check on move, and a rule for what happens on delete. Expensive version: folders that **carry permissions**, which forces role resolution to walk the tree on every document open. Recommendation, if we do folders at all: declare them purely visual. If the real need is organisation rather than hierarchy, tags cost far less.

---

## 2. Tables

### 2.1 Identity & auth — 5 tables 🟢

| Table | What it's for |
|---|---|
| `users` | One row per person. Identity and credentials, supporting both password and OAuth-only accounts. |
| `sessions` | One row per active login. Lets us show "signed in on 3 devices" and cut off access without forcing a password change. |
| `oauthAccounts` | Links an account to a Google, GitHub or 42 login. Separate table so one person can use several providers. |
| `passwordResetTokens` | Short-lived single-use tokens for the "forgot password" flow. |
| `friends` | The social graph: who asked whom, and whether it was accepted. |

> ⚙️ Tokens are stored hashed, never raw. `friends` needs a unique index on the **ordered** pair, otherwise A→B and B→A both insert and one relationship gets two rows. Plus a check that requester and addressee differ. Online status = last seen within 2 minutes, computed at read time — no column needed.
>
> ```sql
> CREATE UNIQUE INDEX friends_pair_uniq ON friends (
>   LEAST(requesterId, addresseeId),
>   GREATEST(requesterId, addresseeId)
> );
> ```

### 2.2 Tenancy — 5 tables

| Table | What it's for | |
|---|---|---|
| `organisations` | A workspace. Owns documents and defines who can reach them — leaving one means losing access to everything inside. | 🟢 |
| `organisationMembers` | Who belongs to which org, and with what authority. This is what makes someone able to see org documents at all. | 🟢 |
| `invitations` | Lets us invite someone by email before they have an account. Expires if unused. | 🟢 |
| `teams` | A named subset of an org's members, so a document can be shared with "Design" rather than six people. | ⚪ §1.8 |
| `teamMembers` | Who is in which team. | ⚪ §1.8 |

An org owns documents. A team owns nothing — deleting one changes no permissions.

> ⚙️ One org per team: a team spanning two would leak access across the boundary. On removal from the org, team membership must go too — drop someone's org membership row, forget their team one, and they keep access to every document shared with that team, silently. A denormalised `orgId` on `teamMembers` plus a composite FK to `organisationMembers` enforces it in the DB. Prisma supports composite FKs, but not overlapping referential actions on a shared field: `onDelete: NoAction` one side, `CASCADE` in a manual migration.

### 2.3 Documents — 5 tables

| Table | What it's for | |
|---|---|---|
| `docs` | One row per document — everything except the content itself: title, owner, org, timestamps, trash flag. | 🟢 |
| `documentStates` | The content, as Yjs stores it. This is what makes a document survive everyone closing their tab. | 🟢 |
| `documentContent` | A readable copy of the same content, kept in sync automatically. Exists so we can search, export and preview without decoding Yjs binary. | 🟢 |
| `documentSnapshots` | Point-in-time copies, so someone can look at or restore an earlier version. | 🟡 §1.2 |
| `folders` | Optional tree for organising documents. | ⚪ §1.9 |

Nothing persists document content today, so `documentStates` comes first — without it, a document is lost when the last tab closes.

Document ids should be UUIDs rather than sequential numbers: they appear in URLs and in the Hocuspocus document name, and sequential ids can be guessed one by one.

> ⚙️ `documentStates` is a separate table rather than columns on `docs` because Hocuspocus rewrites the binary every ~2s, and Prisma has no streaming for `Bytes` — a `findMany` on a document list would pull every document's content into memory. Never `include` it from a `docs` query.
>
> `documentContent` is regenerated in `onStoreDocument` via `TiptapTransformer.fromYdoc()`. Derived data, safe to drop and rebuild.
>
> Each snapshot records its origin (auto / manual / pre-restore), who triggered it if manual, who contributed during the window it covers, a text preview for the history list, its size, and whether it's pinned against purging.

### 2.4 Permissions — 2 tables

| Table | What it's for | |
|---|---|---|
| `documentShares` | Records that a given person or group has a given level of access to a document — the only way to grant anything narrower than "everyone in the org can edit". | 🔴 §1.1 |
| `publicLinks` | Grants access through a URL alone, for people with no account: proofreaders, clients, reviewers. | ⚪ §1.1 |

One row per grant. A document with no rows is private to its owner; a document shared read-only with two people has two rows.

Effective role = strongest of (org role, applicable shares).

> ⚙️ Note for whoever owns auth: public links imply access with no logged-in user, so the design shouldn't assume every connection has one.

### 2.5 Collaboration — 4 tables

| Table | What it's for | |
|---|---|---|
| `commentThreads` | One discussion, anchored to a spot in the text, with whether it's been resolved. | 🟡 §1.3 |
| `comments` | The individual messages inside a thread. | 🟡 §1.3 |
| `notifications` | What each person needs to be told about — mentions, shares, friend requests — and whether they've seen it. | 🟡 §1.6 |
| `activityLog` | A record of who did what, for audit and for showing contribution history. | ⚪ |

> ⚙️ Awareness (cursors, selections, presence) and incremental Yjs updates aren't stored — ephemeral and unnecessary respectively.
