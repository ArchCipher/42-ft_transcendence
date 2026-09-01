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

        if (response.status === 204) { // 204 means doc exists but no persisted Yjs state yet
          return null
        }

        const state = await response.arrayBuffer()

        return new Uint8Array(state)
      },

      // called when hocuspocus wants to persist the latest Yjs document state
      store: async ({ documentName, state }) => {
        const response = await fetch(
          `${webUrl}/api/internal/documents/${encodeURIComponent(documentName)}/state`,
          {
            method: 'PUT',
            headers: {
              'content-type': 'application/octet-stream',
              'x-internal-service-token': internalToken,
            },
            body: new Uint8Array(state),
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
