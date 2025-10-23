import type {NextConfig} from "next";

const nextConfig: NextConfig = {
    /* config options here */
    cacheComponents: true,
    // reactCompiler: true,
    experimental: {
        turbopackFileSystemCacheForDev: true,
    },
};

export default nextConfig;
