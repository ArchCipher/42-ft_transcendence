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

## Framework – Next.js

Next.js is the application framework for the project. It provides React, routing, server rendering, and server-side APIs in one TypeScript codebase.

- App Router for pages and layouts
- Route Handlers and Server Actions for application APIs
- React for the user interface and Tiptap integration

**Styling/UI** – Tailwind CSS

- Tailwind: fits React utility-first workflow

## Text Editor – Tiptap

Tiptap is the rich-text editor. It is built on ProseMirror, supports formatting through extensions, and integrates directly with Yjs and Hocuspocus for collaborative editing.

[tiptap](https://tiptap.dev/)

## Realtime Sync – Yjs

Yjs provides the CRDT document model. Concurrent updates merge automatically, clients converge on the same document state, and local replicas can support offline editing.

The collaboration model uses a central Hocuspocus server rather than peer-to-peer networking.

## CRDT Library – Yjs

Yjs is the selected CRDT library because it has a mature web ecosystem and integrates well with Tiptap and Hocuspocus.

[Yjs github](https://github.com/yjs/yjs)

## Realtime Transport – Hocuspocus

Hocuspocus provides the WebSocket client and server used to synchronize Yjs documents.

- The Hocuspocus client connects the Tiptap editor to the collaboration server.
- The self-hosted Hocuspocus server authenticates connections, relays Yjs updates, and persists collaborative document state.
- Next.js handles the main application, while Hocuspocus runs as the dedicated realtime service.

[hocuspocus github](https://github.com/ueberdosis/hocuspocus)
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
- on reconnect - send queued updates to the Hocuspocus server. The server persists state and sends updates to other clients

## Containerisation

Docker: single command deploy

## ORM – Prisma

ORM (Object–relational mapping): lets you query relational data using typed objects/models instead of writing raw SQL for every query.

Prisma is the selected ORM. It provides migrations and a typed TypeScript client for PostgreSQL. Raw SQL remains available through `$queryRaw` and `$executeRaw` when a query needs direct database control.

---
