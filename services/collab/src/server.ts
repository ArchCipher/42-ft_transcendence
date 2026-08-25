import { Server } from '@hocuspocus/server'
import { Database } from '@hocuspocus/extension-database'

// collab doesn't access postgre directly, it persists Yjs state through this internal Next.js API
const webUrl = process.env.WEB_INTERNAL_URL
const internalToken = process.env.INTERNAL_SERVICE_TOKEN

if (!webUrl || !internalToken) {
  throw new Error('Missing internal service configuration')
}

const server = new Server({
  name: 'hocuspocus-synctext',
  port: 1234,

  // db extension connects hocuspocus's in memory Yjs docs to our persistent Document.ystate storage
  extensions: [
    new Database({
      // called when hocuspocus needs to restore a document
      fetch: async ({ documentName }) => { // documentName is expected to match the Prisma Document.id
        const response = await fetch(
          `${webUrl}/api/internal/documents/${encodeURIComponent(documentName)}/state`,
          {
            method: 'GET',
            headers: {
              'x-internal-service-token': internalToken,
            },
          },
        )

        if (!response.ok) {
          throw new Error(`Failed to load document: ${response.status}`)
        }

        const data = (await response.json()) as { state: string | null }

        if (!data.state) {
          return null
        }
        // the API transports binary Yjs state as base64 JSON
        // hocuspocus needs the original binary state back
        return new Uint8Array(Buffer.from(data.state, 'base64'))
      },
      // called when hocuspocus wants to persist the latest Yjs document state
      store: async ({ documentName, state }) => {
        const response = await fetch(
          `${webUrl}/api/internal/documents/${encodeURIComponent(documentName)}/state`,
          {
            method: 'PUT',
            headers: {
              'content-type': 'application/json',
              'x-internal-service-token': internalToken,
            },
            body: JSON.stringify({
              // convert binary Yjs state to base64 so it can travel inside JSON
              state: Buffer.from(state).toString('base64'),
            }),
          },
        )

        if (!response.ok) {
          throw new Error(`Failed to store document: ${response.status}`)
        }
      },
    }),
  ],
})

server.listen()
