import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ['require-in-the-middle', 'debug', 'module-details-from-path', 'import-in-the-middle', 'cjs-module-lexer', 'es-module-lexer'],
  outputFileTracingIncludes: {
    '/**': [
      './node_modules/require-in-the-middle/**/*',
      './node_modules/debug/**/*',
      './node_modules/module-details-from-path/**/*',
      './node_modules/import-in-the-middle/**/*',
      './node_modules/cjs-module-lexer/**/*',
      './node_modules/es-module-lexer/**/*'],
  },
  // Dev server only: let phones/tablets on the local network load the dev
  // scripts (e.g. http://192.168.x.x:3000). Without this, Next.js blocks them
  // and the page never hydrates.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "*.local"],
};

export default nextConfig;
