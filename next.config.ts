import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @react-pdf/renderer ships ESM + native fontkit deps that should not be
  // re-bundled by Next's server compiler.
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
