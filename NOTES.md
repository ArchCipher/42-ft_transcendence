# Web Development

- Client-side (browser)
- Server-side (backend)
- Styling/UI
- Cross-cutting/query/data

---

## A collaborative platform with real-time features

- Real-time collaboration (multiple peers editing the same document concurrently)
- CRDT-based sync with Yjs (library) for collaborative editing
- Core correctness properties as first-class deliverables
  - Idempotency: re-delivered operations don’t change final state
  - Causal/ordering handling: how you apply ops when they arrive out of order
  - Convergence: all peers end up with the same document state
  - Conflict handling: concurrent inserts/deletes resolve deterministically

---

## TODO

- Choose language, frameworks, database, container
- Choose major and minor modules (14 points) + create GitHub issues
- Assign modules/issues

Note: Techincal choices and modules chosen below are not final. Scope and technical choices per module may change as the team learns more during the project.

---

## Roles

- PO: Kiruthika Murugananthan (intra: kmurugan)
- PM: Tom Murua (intra: tmurua)
- Team Lead: Umberto Ponci (intra:uponci)

---

## Modules

### Major

1. Frameworks frontend + backend
2. WebSockets real-time
3. Standard user management
4. Organization system

### Minor

1. Collaborative live editing
2. ORM
3. Notification system
4. File upload
5. OAuth 2.0
6. i18n (3 languages)

Other (Mandatory):

1. Privacy Policy and Terms of Service pages with relevant content

Bonus:

1. WAF/ModSecurity + Vault (Major)
2. Monitoring system with Prometheus and Grafana (Major)
3. 2FA (Two-Factor Authentication) system (Minor)
4. Advanced search
5. Support for additional browsers

---

## Technical Choices

## Language – TypeScript (FE + BE)

- Static type checking (catches bugs early)
- Better maintainability

One language for whole stack. JS is native web language. TypeScript is JavaScript with type safety. Static typing helps team maintain auth, orgs, editor integration.

## Framework

- Architecture and conventions to organise code
- Built in features (for routing, state management etc)
- Ecosystem of tools and libraries

**Frontend choice** – React (bundler: Vite) + React Router

SPA (Single Page Application): one app shell loads once, then React/JavaScript updates views without full page reloads. This fits a collaborative editor with live updates. We build with React + Vite + React Router and serve the bundle behind nginx.

- React: UI framework with strong TipTap integration. Static app behind nginx matches Docker setup and is simpler than Next.js for this project
- Vite: Build tool - starts dev server, bundles JS for production. Not a framework
- React Router: client-side page routing (/login, /docs/:id)
- Next.js skipped (React + built-in routing/SSR/API). Nest stays the only backend

**Backend choice** – NestJS

- Fastify: Lighter TS API, great performance/validation
- NestJS: Clear folders (modules/controllers), larger app (auth, orgs, uploads, notification)

**Styling/UI** – Tailwind CSS

- Tailwind: fits React utility-first workflow

## Text Editor (ProseMirror vs TipTap)

ProseMirror
- Max low-level control
- Wide custom formatting options

Tiptap
- Built directly on ProseMirror
- Rich formatting via extensions

Choice: Tiptap - Enough formatting via extensions, faster delivery

[ProseMirror vs TipTap](https://medium.com/@support_56991/prosemirror-vs-tiptap-2026-whats-the-difference-6a7138bf7d8e)
[ProseMirror](https://prosemirror.net/)
[tiptap](https://tiptap.dev/)

## Realtime sync (OT vs CRDT)

OT (Operational Transformation)
- centralised, server authoritative architecture
- sends operations (insert 'x' at position 'y')
- server/peers transform operations so concurrent edits apply correctly

CRDT (Conflict-free Replicated Data Type)
- updates merge automatically without writing complex OT transform rules
- works well with a central relay and offline via local replicas
- Limitation: more metadata/memory (negligible at our doc size)

Choice: CRDT (Yjs) with a central server that relays updates (not P2P networking).

Clients ↔ Nest WebSocket gateway ↔ other clients

[OT vs CRDT](https://www.taskade.com/blog/ot-vs-crdt)

## CRDT library (Yjs vs AutoMerge)

Yjs
- Algorithm: YATA (Yet Another Transformation Approach)

Automerge
- Algorithm: RGA (Replicated Growable Array)

Choice: Yjs - mature web ecosystem, shared types, strong editor adapters and practical production usage

[Yjs github](https://github.com/yjs/yjs)
[automerge github](https://github.com/automerge/automerge)

## Realtime transport (WebSockets)

Server relays Yjs updates

Options:

- Nest WebSocket gateway + yjs + y-protocols: one backend, more manual work
- Hocuspocus self-hosted: Yjs collab server, strong TipTap fit
- y-websocket as a separate small server: official Yjs example server

Choice: Nest WebSocket gateway + yjs + y-protocols - one backend, clear WebSockets

[y-protocols github](https://github.com/yjs/y-protocols)
[hocuspocus github](https://github.com/ueberdosis/hocuspocus)
[y-websocket github](https://github.com/yjs/y-websocket)
[Beginner's Guide to WebSockets](https://www.youtube.com/watch?v=8ARodQ4Wlf4)

## Relational Database

PostgreSQL
- Mature tooling
- Auth, organisations, document metadata, permissions
- Works well with ORMs

### What lives where
- Postgres + Prisma: users, orgs, membership, doc title/ACL, notifications, files
- Yjs: collaborative document body / CRDT state (persist snapshot or updates on Document)
- Prisma does not merge concurrent edits. Yjs does not replace user/org tables

Optional offline (after refresh/ closing tab)
- when disconnected - persist locally (Indexed DB) and apply edits to local Y.Doc
- on reconnect - send queued updates to the central Nest server. Server persists state and fans out updates to other clients

## Containerisation

Docker: single command deploy

## ORM (Prisma vs TypeORM)

ORM (Object–relational mapping): lets you query relational data using typed objects/models instead of writing raw SQL for every query.

Limitation: ORMs can hide generated SQL, reduce query control and require ORM-specific language overhead. We can use `$queryRaw` **/** `$executeRaw` to write `raw SQL` when we need full control (complex report query, DB-specific feature)

Prisma
- Popular with TypeScript - Migrations + typed client. More generated code but simpler to learn than TypeORM

TypeORM
- Powerful but heavier API and learning surface

Choice: Prisma - fits Nest + Postgres

---
