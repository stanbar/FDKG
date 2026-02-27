/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",   // static HTML export → Cloudflare Pages serves from out/
  // Transpile shared-crypto (its main points to raw .ts source)
  transpilePackages: ["shared-crypto"],
  webpack: (config, { webpack }) => {
    // shared-crypto uses "node:assert", "node:crypto", etc. — strip the prefix
    // so webpack resolves them via the standard Node.js built-in polyfills.
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
        resource.request = resource.request.replace(/^node:/, "");
      })
    );
    // WASM support (circomlibjs / ffjavascript)
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      // crypto.randomBytes → browser-compatible polyfill
      crypto: "crypto-browserify",
      stream: false,
      vm: false,
    };
    // Allow importing .ts files from shared-crypto
    config.resolve.extensionAlias = {
      ".js": [".ts", ".js"],
    };
    return config;
  },
};

export default nextConfig;
