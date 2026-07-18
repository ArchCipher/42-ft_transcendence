*This project has been created as part of the 42 curriculum by gzanin, kmurugan, ...*

# SyncText (or SyncDoc) - ft_transcendence

## Description

SyncText is a collaborative workspace where teams edit shared plain-text documents
together in real time. Multiple users can sign in, join an organization, open the
same document, and see live updates while the system keeps everyone’s copy
consistent.

### Key features

- Sign up / login, profiles, avatars, friends & online status
- Organizations / workspaces that own documents
- Real-time multi-user editing (WebSockets + CRDT)
- Notifications, file attachments, OAuth login, UI in 3 languages
- Privacy Policy and Terms of Service linked from the site footer
- Bonus: Hardened WAF/ModSecurity + HashiCorp Vault for secrets

---

## Instructions

### Prerequisites

- Docker and Docker Compose
- Google Chrome (latest stable)
- ...

### Compile & Run

**First-time setup:**

```sh
# recommended: pass domain to create .env, secrets/, and TLS cert
make setup DOMAIN_NAME=<domain_name>

# then edit .env
# then edit secrets/*.txt: add real passwords
```

Or without passing the domain:

```sh
make setup

# then edit .env
# then edit secrets/*.txt: add real passwords

make setup_cert
```

Open the app in Chrome at [https://localhost](https://localhost): (TBD) (accept the self-signed cert).
Privacy Policy and Terms of Service: footer links on every page.

**Start services:**

```sh
# start services using:
make # or: make up

# stop services
make down # or: make clean

# container logs
make logs

# list containers
make ps

# list containers, images, networks
make test

# stop services and remove DB volumes
make fclean

# rebuild from scratch
make re
```

---

## Architecture

```text
Browser
  │ HTTPS
  ▼
[nginx] ──(bonus: ModSecurity)──► API + WebSocket gateway
                                    │
                                    ▼
                                 Database (ORM)

(bonus) Vault ── secrets ─────────► API
```

## Technical Stack

| Layer    | Choice               | Why |
| -------- | -------------------- | --- |
| Frontend | TBD                  | ... |
| Backend  | TBD                  | ... |
| Database | TBD                  | ... |
| Other    | WebSockets, ORM, ... | ... |

## Database Schema

- User
- Organisations
- Document
- ...

## Features List:

| Feature                   | Owner(s) | Description                             |
| ------------------------- | -------- | --------------------------------------- |
| Auth                      | ...      | Signup/login with hashed passwords      |
| Live collaborative editor | ...      | Multi-user CRDT editing over WebSockets |
| Organizations             | ...      | Create/join workspaces that own docs    |
| Notifications             | ...      | Events for share, invite, updates       |
| File upload               | ...      | Attachments with validation             |
| ...                       | ...      | ...                                     |
| Privacy / Terms pages     | ...      | Footer-accessible legal pages           |

## Modules

### Mandatory (14 pts)

| **Module**                 | **Type** | **Pts** | **Owner** | **Implementation** |
| -------------------------- | -------- | ------- | --------- | ------------------ |
| Frameworks FE + BE         | Major    | 2       |           |                    |
| WebSockets real-time       | Major    | 2       |           |                    |
| Collaborative live editing | Minor    | 1       |           |                    |
| Standard user management   | Major    | 2       |           |                    |
| Organization system        | Major    | 2       |           |                    |
| ORM                        | Minor    | 1       |           |                    |
| Notification system        | Minor    | 1       |           |                    |
| File upload                | Minor    | 1       |           |                    |
| OAuth 2.0                  | Minor    | 1       |           |                    |
| i18n (3 languages)         | Minor    | 1       |           |                    |
| **Total**                  |          | **14**  |           |                    |

-  Justification for each module choice, especially for custom "Modules of choice".

### **Bonus**

| **Module**              | **Type** | **Pts** | **Owner** |
| ----------------------- | -------- | ------- | --------- |
| WAF/ModSecurity + Vault | Major    | 2       |           |

Bonus Justification: Protects the public HTTP edge and keeps secrets out of images/runtime env. Appropriate for a multi-user app handling credentials and shared documents.

## Team Information

| Login | Role(s) | Responsibilities |
| ----- | ------- | ---------------- |
| ... | PO / Dev | ... |
| ... | PM / Dev | ... |
| ... | Tech Lead / Dev | ... |
| ... | Dev | ... |
| ... | Dev | ... |

## Project Management:

- Organization: (task distribution, meetings, etc.)
- Tools: (GitHub Issues, Trello, etc)
- Communication: Slack / ...

## Individual Contributions:

**Login1**
- Contributions:
- Challenges and solution:

**Login2**
- Contributions:
- Challenges and solution:

...

---

## Resources

- 

### Use of AI

- 
- 

---
