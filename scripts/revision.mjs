import { execFileSync } from "node:child_process";

/** The commit this build represents: CI passes it in; a local build asks git. */
export const revision = () =>
  process.env.SITE_REVISION ||
  process.env.GITHUB_SHA ||
  execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
