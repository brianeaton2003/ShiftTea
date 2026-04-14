import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** This package lives under the repo root; lockfiles in both places confuse Next's root inference. */
const shiftteaDir = path.dirname(fileURLToPath(import.meta.url));

module.exports = {
  allowedDevOrigins: ['10.0.0.231'],
};

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  outputFileTracingRoot: shiftteaDir,
  turbopack: {
    root: shiftteaDir,
  },
};

export default nextConfig;
