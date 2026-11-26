import type { NextConfig } from "next";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (key && !url) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL with the public Supabase key.");
}
if (key && !key.startsWith("sb_publishable_")) {
  let role: string | undefined;
  try {
    role = JSON.parse(
      Buffer.from(key.split(".")[1], "base64url").toString(),
    ).role;
  } catch {
    // Invalid or non-JWT key.
  }
  if (role !== "anon") {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY must be a publishable key or legacy anon key.",
    );
  }
}

const nextConfig: NextConfig = {};
export default nextConfig;
