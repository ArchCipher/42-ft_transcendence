import { Server } from '@hocuspocus/server'

const server = new Server({
  name: 'hocuspocus-synctext',
  port: 1234,
  // no further config set yet... see the doc => https://hocuspocus.dev/docs/server/configuration
});

server.listen();