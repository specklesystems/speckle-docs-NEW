import { defineConfig } from "universal-ai-config";

export default defineConfig({
  targets: ["claude", "copilot", "cursor"],
  variables: {
    projectName: "speckle-docs",
  },
});
