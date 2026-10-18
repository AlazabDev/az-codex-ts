import {
  checkOllamaModel,
  listOllamaModels,
  ollamaConfig,
  ollamaFailure,
  ollamaModelName,
} from "../src/lib/ai/ollama.server";

// Uses the same deployment credentials, model adapter and checks as the app.
// No secrets or upstream response bodies are printed.
async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    console.log("bun run check:ollama [--catalog-only | --model <native-model-name>]");
    return;
  }
  const catalogOnly = args.length === 1 && args[0] === "--catalog-only";
  if (args.length && !catalogOnly && !(args.length === 2 && args[0] === "--model" && args[1])) {
    throw new Error("Use --catalog-only or --model <native-model-name>.");
  }
  const selected = `ollama/${args[1] || "gpt-oss:20b"}`;
  ollamaModelName(selected);
  const { baseURL, authMode } = ollamaConfig();
  console.log(JSON.stringify({ stage: "configuration", baseURL, authMode }));
  const models = await listOllamaModels();
  console.log(JSON.stringify({ stage: "catalog", ok: true, models }));
  if (catalogOnly) return;
  if (!models.some((model) => model.id === selected)) {
    console.log(
      JSON.stringify({ ok: false, stage: "catalog", code: "not_found", model: selected }),
    );
    process.exitCode = 1;
    return;
  }
  console.log(JSON.stringify({ stage: "generation", model: selected, status: "running" }));
  const result = await checkOllamaModel(selected);
  console.log(JSON.stringify({ model: selected, ...result }));
  if (!result.ok) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.log(JSON.stringify(ollamaFailure(error)));
  process.exitCode = 1;
});
