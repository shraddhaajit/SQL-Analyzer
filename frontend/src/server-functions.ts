import { createServerFn } from "@tanstack/react-start";
import { execFileSync } from "child_process";
import path from "path";
import fs from "fs";

// Resolve main.py location dynamically based on Vite process location
const getPythonScriptPath = (): string => {
  const paths = [
    path.resolve(process.cwd(), "backend/main.py"),
    path.resolve(process.cwd(), "../backend/main.py"),
    path.resolve(process.cwd(), "SQL-Analyzer-backend-development/backend/main.py"),
    path.resolve(process.cwd(), "SQL-Analyzer-backend-development/SQL-Analyzer-backend-development/backend/main.py")
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return "backend/main.py"; // fallback
};

const runPythonCLI = (args: string[]): any => {
  const script = getPythonScriptPath();
  const scriptDir = path.dirname(script);

  const commandOptions = {
    encoding: "utf-8" as const,
    maxBuffer: 20 * 1024 * 1024,
    cwd: scriptDir, // Run from backend directory context to resolve imports correctly
    stdio: ["pipe", "pipe", "inherit"] as const
  };

  const commands = ["python", "python3", "py"];
  let lastError: any = null;

  for (const cmd of commands) {
    try {
      const output = execFileSync(cmd, [script, ...args], commandOptions);
      console.log("[DEBUG runPythonCLI] output:", output.trim());
      return JSON.parse(output.trim());
    } catch (err: any) {
      lastError = err;
    }
  }
  
  const errMsg = lastError?.stderr || lastError?.message || "Python backend execution failed";
  console.error("All python commands failed. Script path:", script, "Error details:", errMsg);
  throw new Error(errMsg);
};

export const analyzeQueryFn = createServerFn({ method: "POST" })
  .validator((query: string) => query)
  .handler(async ({ data: query }) => {
    return runPythonCLI(["--analyze", "--query", query]);
  });

export const getHistoryFn = createServerFn({ method: "GET" })
  .validator((filter: string) => filter)
  .handler(async ({ data: filter }) => {
    return runPythonCLI(["--history", "--risk-filter", filter]);
  });

export const saveHistoryFn = createServerFn({ method: "POST" })
  .validator((data: { query: string; prediction: number; risk: string; model: string; rulesCount: number }) => data)
  .handler(async ({ data }) => {
    return runPythonCLI([
      "--save-history",
      "--query", data.query,
      "--prediction", String(data.prediction),
      "--risk", data.risk,
      "--model", data.model,
      "--rules-count", String(data.rulesCount)
    ]);
  });

export const clearHistoryFn = createServerFn({ method: "POST" })
  .handler(async () => {
    return runPythonCLI(["--clear-history"]);
  });

export const generatePdfReportFn = createServerFn({ method: "POST" })
  .validator((data: { query: string; prediction: number; risk: string; rules: any[] }) => data)
  .handler(async ({ data }) => {
    return runPythonCLI([
      "--generate-pdf",
      "--query", data.query,
      "--prediction", String(data.prediction),
      "--risk", data.risk,
      "--rules-json", JSON.stringify(data.rules)
    ]);
  });

export const getEvaluationMetricsFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const paths = [
      path.resolve(process.cwd(), "outputs/evaluation_metrics_ablation.csv"),
      path.resolve(process.cwd(), "../outputs/evaluation_metrics_ablation.csv"),
      path.resolve(process.cwd(), "SQL-Analyzer-backend-development/outputs/evaluation_metrics_ablation.csv"),
      path.resolve(process.cwd(), "SQL-Analyzer-backend-development/SQL-Analyzer-backend-development/outputs/evaluation_metrics_ablation.csv"),
      path.resolve(process.cwd(), "backend/outputs/evaluation_metrics_ablation.csv"),
      path.resolve(process.cwd(), "backend/dataset_generation/outputs/evaluation_metrics_ablation.csv")
    ];
    let foundPath = "";
    for (const p of paths) {
      if (fs.existsSync(p)) {
        foundPath = p;
        break;
      }
    }
    if (!foundPath) return null;
    try {
      const content = fs.readFileSync(foundPath, "utf-8");
      const lines = content.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) return null;
      const headers = lines[0].split(",");
      const data = lines.slice(1).map(l => {
        const parts = l.split(",");
        const obj: any = {};
        headers.forEach((h, idx) => {
          obj[h] = parts[idx];
        });
        return obj;
      });
      return data;
    } catch (e) {
      console.error("Error reading metrics CSV:", e);
      return null;
    }
  });

export const getEvaluationDataFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const paths = [
      path.resolve(process.cwd(), "outputs/evaluation_data.json"),
      path.resolve(process.cwd(), "../outputs/evaluation_data.json"),
      path.resolve(process.cwd(), "SQL-Analyzer-backend-development/outputs/evaluation_data.json"),
      path.resolve(process.cwd(), "SQL-Analyzer-backend-development/SQL-Analyzer-backend-development/outputs/evaluation_data.json")
    ];
    let foundPath = "";
    for (const p of paths) {
      if (fs.existsSync(p)) {
        foundPath = p;
        break;
      }
    }
    if (!foundPath) return null;
    try {
      const content = fs.readFileSync(foundPath, "utf-8");
      return JSON.parse(content);
    } catch (e) {
      console.error("Error reading evaluation data JSON:", e);
      return null;
    }
  });

export const getDbStatsFn = createServerFn({ method: "GET" })
  .handler(async () => {
    return runPythonCLI(["--db-stats"]);
  });
