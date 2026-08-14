PK - Primary Key
FK - Foreign Key

Table 1 - users
id SERIAL PK
email TEXT UNIQUE - NOT NULL
username TEXT UNIQUE - NOT NULL
passwordHash TEXT NULL -- null = OAuth (Google/42/Github) only account
role TEXT DEFAULT 'user' -- 'user' | 'admin'
avatarUrl TEXT NULL -- null = show default avatar
lastSeenAt TIMESTAMP NULL -- for "online status"
createdAt TIMESTAMP DEFAULT now()
updatedAt TIMESTAMP DEFAULT now()
emailVerifiedAt TIMESTAMP NULL

NOTE:
1. use citext or lowercase for email
[postgres citext docs](https://www.postgresql.org/docs/current/citext.html)
2. This will need DELETE path. Account deletion must also delete friends, organisation etc

TABLE 2 - friends
id SERIAL PK
requesterId FK -> users.id
addresseeId FK -> users.id
status TEXT DEFAULT 'pending' -- pending | accepted | declined
createdAt TIMESTAMP DEFAULT now()
UNIQUE(requesterId, addresseeId)
decidedAt TIMESTAMP NULL

NOTE:
1. Online status = lastSeenAt within 2 minutes
2. Check requesterId != addresseeId

TABLE 3 - sessions
id SERIAL PK
userId FK -> users.id
tokenHash TEXT UNIQUE
expiresAt TIMESTAMP
revokedAt TIMESTAMP NULL
lastUsedAt TIMESTAMP NULL
ip TEXT NULL
userAgent TEXT NULL

NOTE:
1. tokenHash should store hashed token, not raw

TABLE 4 - organisations
id SERIAL PK
name TEXT NOT NULL
slug TEXT UNIQUE - NOT NULL -- check url collision
createdBy FK -> users.id
createdAt TIMESTAMP DEFAULT now()

TABLE 5 - organisationMembers
id SERIAL PK
orgId FK -> organisations.id
userId FK -> users.id
roleInOrg TEXT DEFAULT 'member' -- owner/admin/member
joinedAt TIMESTAMP DEFAULT now()
UNIQUE(orgId, userId)

TABLE 6 - notifications
id SERIAL PK
userId FK -> users.id -- who receives it
type TEXT NOT NULL -- 'account_creation', 'account_update', 'account_deletion', 'friend_request' ...
content TEXT NOT NULL
readAt TIMESTAMP NULL
createdAt TIMESTAMP DEFAULT now()
referenceType TEXT NULL -- what should lead when you click it Ex: 'friend_request'
referenceId INT NULL -- what should lead when you click it. FK-like pointer, the friend request id
actionPayload JSONB NULL -- structured data the UI needs to act

TABLE 7 - docs
id SERIAL PK
title TEXT DEFAULT 'Untitled'
ownerId FK -> users.id
orgId FK -> organisations.id NULL -- NULL private doc, owner only
createdAt TIMESTAMP DEFAULT now()
updatedAt TIMESTAMP DEFAULT now()

NOTE:
1. orgId NULL would mean a private document. If not NULL, it would be visible to the team/ organisationMembers

TABLE 8 - oauthAccounts
id SERIAL PK
provider TEXT NOT NULL
providerAccountId TEXT NOT NULL
userId FK -> users.id
UNIQUE(provider, providerAccountId)

Table 9 - passwordResetTokens
id SERIAL PK
userId FK -> users.id 
tokenHash TEXT UNIQUE
createdAt TIMESTAMP DEFAULT now()
expiresAt TIMESTAMP NOT NULL -- 30 mins from createdAt
usedAt TIMESTAMP NULL

NOTE:
1. password reset should work only if usedAt is NULL and expiresAt > now()

Table 10 - emailVerificationTokens
id SERIAL PK
userId FK -> users.id
tokenHash TEXT UNIQUE
createdAt TIMESTAMP DEFAULT now()
expiresAt TIMESTAMP NOT NULL -- 24 hrs from createdAt
usedAt TIMESTAMP NULL
