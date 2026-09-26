import type { NextConfig } from "next";
import path from "node:path";


/*
Every response gets the Content-Security-Policy header, telling the browser
"only load code / styles / connections from these origins". This is the safety
net for XSS: even if a malicious doc slips past sanitizing, the browser refuses
to run inline scripts or send data to malicious websites.

Directives explained:
  default-src 'self'          fallback for anything not listed below
  script-src 'self'           no inline scripts -> XSS safety net
  style-src 'self' 'unsafe-inline'  Tiptap/Tailwind inline styles
  img-src 'self' data:        images from our server or inline base64 (pasted images in editor)
  font-src 'self' data:       fonts if we self-host them
  connect-src 'self'          covers the Hocuspocus WebSocket too: nginx proxies
                               it at /collab on the same origin as the page
  frame-ancestors 'none'      block framing/clickjacking
  base-uri 'self'             stop attackers rewriting <base> to load scripts from their domain
*/

const securityHeaders = [
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data:",
          "font-src 'self' data:",
          "connect-src 'self'",
          "object-src 'none'",
          "form-action 'self'",
          "frame-ancestors 'none'",
          "base-uri 'self'",
        ].join("; "),
      },
    ];

// Extra headers for defense-in-depth
const otherHeaders = [
  {
    key: "X-Frame-Options",
    value: "DENY", // older browser fallback for frame-ancestors (clickjacking)
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin", // default in most browsers
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  // the workspace root is one level up from synctext/, so file tracing
  // for the standalone build can see packages/db
  outputFileTracingRoot: path.join(process.cwd(), ".."),
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg"],

  // Headers: securityHeaders, otherHeaders
  async headers() {
    return [
      {
        source: "/(.*)", // apply to every route
        headers: [...securityHeaders, ...otherHeaders],
      },
    ];
  },
};

export default nextConfig;
