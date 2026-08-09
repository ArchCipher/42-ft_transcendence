import { Database } from "@hocuspocus/extension-database";
import { Server } from "@hocuspocus/server";
import { prisma } from "@synctext/db";

const port = Number(process.env.PORT ?? 1234);
const debounce = Number(process.env.STORE_DEBOUNCE_MS ?? 2000);
const maxDebounce = Number(process.env.STORE_MAX_DEBOUNCE_MS ?? 10000);

const server = new Server({
  port,
  debounce,
  maxDebounce,
  extensions: [
    new Database({
      async fetch({ documentName }) {
        const document = await prisma.document.findUnique({
          where: { id: documentName },
        });

        return document?.ystate ?? null;
      },

      // Only ystate is written here. Title and metadata belong to web.
      // updateMany (not update) because the row may not exist yet if the
      // client connects before web has created the document — update
      // would throw on a missing row and crash the server.
      async store({ documentName, state }) {
        await prisma.document.updateMany({
          where: { id: documentName },
          data: { ystate: Buffer.from(state) },
        });
      },
    }),

    {
      // TODO: verify a JWT (COLLAB_JWT_SECRET) once web has user sessions.
      // Every connection is accepted as anonymous for now.
      async onAuthenticate() {
        return { userId: "anonymous" };
      },

      async onRequest({ request, response }) {
        if (request.url !== "/healthz") return;

        response.writeHead(200, { "Content-Type": "text/plain" });
        response.end("ok");

        // Throwing a falsy value stops Hocuspocus from also writing its
        // own default response — anything truthy here would instead be
        // re-thrown as an unhandled rejection in the http server.
        throw null;
      },

      async onDestroy() {
        console.log("collab: pending documents flushed, shutting down");
      },
    },
  ],
});

server.listen();
