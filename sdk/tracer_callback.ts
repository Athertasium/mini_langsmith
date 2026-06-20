/**
 * Drop-in LangChain callback handler for TypeScript. Sends spans to Tracer collector.
 *
 * Usage:
 *   import { CustomTracer } from "./tracer_callback";
 *   const tracer = new CustomTracer({ endpoint: "http://localhost:8000", project: "doclens", apiKey: "..." });
 *   await chain.invoke(input, { callbacks: [tracer] });
 *
 * Drop this single file into your repo — no npm package needed.
 * Requires @langchain/core already installed (it's a peer dep of your LangChain setup).
 */

import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import type { Serialized } from "@langchain/core/load/serializable";
import type { LLMResult } from "@langchain/core/outputs";
import type { BaseMessage } from "@langchain/core/messages";

// Per-1M-token pricing [input_usd, output_usd]
const PRICING: Record<string, [number, number]> = {
  // OpenAI
  "gpt-4o":                 [2.50,  10.00],
  "gpt-4o-mini":            [0.15,   0.60],
  "gpt-4-turbo":            [10.00, 30.00],
  "gpt-4":                  [30.00, 60.00],
  "gpt-3.5-turbo":          [0.50,   1.50],
  // Anthropic Claude 4.x
  "claude-opus-4":          [15.00, 75.00],
  "claude-sonnet-4":        [3.00,  15.00],
  "claude-haiku-4":         [0.80,   4.00],
  // Anthropic Claude 3.x
  "claude-3-5-sonnet":      [3.00,  15.00],
  "claude-3-5-haiku":       [0.80,   4.00],
  "claude-3-opus":          [15.00, 75.00],
  "claude-3-haiku":         [0.25,   1.25],
  // Groq / Meta Llama
  "llama3-8b-8192":         [0.05,   0.08],
  "llama3-70b-8192":        [0.59,   0.79],
  "llama-3.1-8b-instant":   [0.05,   0.08],
  "llama-3.3-70b-versatile":[0.59,   0.79],
  // Groq / Mixtral / Gemma
  "mixtral-8x7b-32768":     [0.24,   0.24],
  "gemma-7b-it":            [0.07,   0.07],
};

function computeCost(
  model: string | null | undefined,
  promptTokens: number | null | undefined,
  completionTokens: number | null | undefined,
): number | null {
  if (!model || promptTokens == null || completionTokens == null) return null;
  const key = model.toLowerCase();
  for (const [name, [inp, out]] of Object.entries(PRICING)) {
    if (key.includes(name) || key.startsWith(name)) {
      return (promptTokens * inp + completionTokens * out) / 1_000_000;
    }
  }
  return null;
}

interface TracerOptions {
  /** Falls back to TRACER_ENDPOINT env var. Default: "http://localhost:8000" */
  endpoint?: string;
  /** Falls back to TRACER_NAME then PROJECT env var. */
  project?: string;
  /** Falls back to TRACER_API_KEY env var. */
  apiKey?: string;
  /** Key in chain outputs that holds the routing decision. Default: "routerDecision" */
  routerDecisionKey?: string;
}

type Payload = Record<string, unknown>;

export class CustomTracer extends BaseCallbackHandler {
  name = "CustomTracer";

  private readonly endpoint: string;
  private readonly project: string;
  private readonly apiKey: string;
  private readonly routerDecisionKey: string;
  private readonly startTimes = new Map<string, number>();
  private readonly sessions = new Map<string, string>();
  private readonly names = new Map<string, string>();

  constructor({ endpoint, project, apiKey, routerDecisionKey = "routerDecision" }: TracerOptions = {}) {
    super();
    const resolvedProject = project ?? process.env.TRACER_NAME ?? process.env.PROJECT;
    if (!resolvedProject) throw new Error("CustomTracer: project required — pass project: or set TRACER_NAME env var");

    const resolvedApiKey = apiKey ?? process.env.TRACER_API_KEY;
    if (!resolvedApiKey) throw new Error("CustomTracer: apiKey required — pass apiKey: or set TRACER_API_KEY env var");

    const resolvedEndpoint = endpoint ?? process.env.TRACER_ENDPOINT ?? "http://localhost:8000";

    this.endpoint = resolvedEndpoint.replace(/\/$/, "");
    this.project = resolvedProject;
    this.apiKey = resolvedApiKey;
    this.routerDecisionKey = routerDecisionKey;
  }

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------

  private recordStart(runId: string): string {
    this.startTimes.set(runId, Date.now());
    return new Date().toISOString();
  }

  private popStart(runId: string): string {
    const ms = this.startTimes.get(runId);
    this.startTimes.delete(runId);
    return ms ? new Date(ms).toISOString() : new Date().toISOString();
  }

  private getSession(runId: string, parentRunId?: string): string {
    if (!parentRunId) {
      this.sessions.set(runId, runId);
      return runId;
    }
    const session = this.sessions.get(parentRunId) ?? runId;
    this.sessions.set(runId, session);
    return session;
  }

  private lookupSession(runId: string): string | undefined {
    return this.sessions.get(runId);
  }

  private fire(payload: Payload): void {
    const body = JSON.stringify({ ...payload, project: this.project });
    fetch(`${this.endpoint}/runs`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": this.apiKey },
      body,
    }).catch(() => {});
  }

  // ------------------------------------------------------------------
  // LLM
  // ------------------------------------------------------------------

  async handleLLMStart(
    llm: Serialized,
    prompts: string[],
    runId: string,
    parentRunId?: string,
    _extraParams?: Record<string, unknown>,
    tags?: string[],
  ): Promise<void> {
    const startTime = this.recordStart(runId);
    const llmName = llm.id?.[llm.id.length - 1] ?? "llm";
    this.names.set(runId, llmName);
    this.fire({
      id: runId,
      parent_id: parentRunId ?? null,
      session_id: this.getSession(runId, parentRunId),
      name: llmName,
      run_type: "llm",
      inputs: { prompts },
      start_time: startTime,
      tags: tags ?? [],
    });
  }

  async handleChatModelStart(
    llm: Serialized,
    messages: BaseMessage[][],
    runId: string,
    parentRunId?: string,
    _extraParams?: Record<string, unknown>,
    tags?: string[],
  ): Promise<void> {
    const startTime = this.recordStart(runId);
    const llmName = llm.id?.[llm.id.length - 1] ?? "llm";
    this.names.set(runId, llmName);
    this.fire({
      id: runId,
      parent_id: parentRunId ?? null,
      session_id: this.getSession(runId, parentRunId),
      name: llmName,
      run_type: "llm",
      inputs: {
        messages: messages.map((batch) =>
          batch.map((m) => ({ role: m._getType(), content: m.content }))
        ),
      },
      start_time: startTime,
      tags: tags ?? [],
    });
  }

  async handleLLMEnd(output: LLMResult, runId: string, parentRunId?: string): Promise<void> {
    const startTime = this.popStart(runId);
    const llmOutput = output.llmOutput ?? {};
    const tokenUsage = (llmOutput.token_usage ?? llmOutput.tokenUsage ?? {}) as Record<string, number>;
    const modelName: string | null = llmOutput.model_name ?? llmOutput.modelName ?? null;
    const promptTokens: number | null = tokenUsage.prompt_tokens ?? tokenUsage.promptTokens ?? null;
    const completionTokens: number | null = tokenUsage.completion_tokens ?? tokenUsage.completionTokens ?? null;
    const totalTokens: number | null = tokenUsage.total_tokens ?? tokenUsage.totalTokens ?? null;
    const costUsd = computeCost(modelName, promptTokens, completionTokens);
    const extra: Record<string, unknown> = {
      model_name: modelName,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
    };
    if (costUsd != null) extra.cost_usd = costUsd;
    this.fire({
      id: runId,
      parent_id: parentRunId ?? null,
      session_id: this.lookupSession(runId) ?? null,
      name: (() => { const n = this.names.get(runId); this.names.delete(runId); return n ?? "llm"; })(),
      run_type: "llm",
      outputs: {
        generations: output.generations.map((gen) =>
          gen.map((g) => ("text" in g ? g.text : String(g)))
        ),
      },
      start_time: startTime,
      end_time: new Date().toISOString(),
      extra,
    });
  }

  async handleLLMError(err: Error, runId: string, parentRunId?: string): Promise<void> {
    const startTime = this.popStart(runId);
    const name = this.names.get(runId) ?? "llm";
    this.names.delete(runId);
    this.fire({
      id: runId,
      parent_id: parentRunId ?? null,
      session_id: this.lookupSession(runId) ?? null,
      name,
      run_type: "llm",
      error: err.message,
      start_time: startTime,
      end_time: new Date().toISOString(),
    });
  }

  // ------------------------------------------------------------------
  // Chain
  // ------------------------------------------------------------------

  async handleChainStart(
    chain: Serialized,
    inputs: Record<string, unknown>,
    runId: string,
    parentRunId?: string,
    tags?: string[],
    _metadata?: Record<string, unknown>,
    _runType?: string,
    name?: string,
  ): Promise<void> {
    const startTime = this.recordStart(runId);
    const chainName = name ?? chain.id?.[chain.id.length - 1] ?? "chain";
    this.names.set(runId, chainName);
    this.fire({
      id: runId,
      parent_id: parentRunId ?? null,
      session_id: this.getSession(runId, parentRunId),
      name: chainName,
      run_type: "chain",
      inputs,
      start_time: startTime,
      tags: tags ?? [],
    });
  }

  async handleChainEnd(
    outputs: Record<string, unknown>,
    runId: string,
    parentRunId?: string,
  ): Promise<void> {
    const startTime = this.popStart(runId);
    const name = this.names.get(runId) ?? "chain";
    this.names.delete(runId);
    const branchDecision =
      outputs && typeof outputs === "object"
        ? (outputs[this.routerDecisionKey] as string | undefined)
        : undefined;

    const payload: Payload = {
      id: runId,
      parent_id: parentRunId ?? null,
      session_id: this.lookupSession(runId) ?? null,
      name,
      run_type: "chain",
      outputs,
      start_time: startTime,
      end_time: new Date().toISOString(),
    };
    if (branchDecision != null) {
      payload.branch_decision = String(branchDecision);
    }
    this.fire(payload);
  }

  async handleChainError(err: Error, runId: string, parentRunId?: string): Promise<void> {
    const startTime = this.popStart(runId);
    const name = this.names.get(runId) ?? "chain";
    this.names.delete(runId);
    this.fire({
      id: runId,
      parent_id: parentRunId ?? null,
      session_id: this.lookupSession(runId) ?? null,
      name,
      run_type: "chain",
      error: err.message,
      start_time: startTime,
      end_time: new Date().toISOString(),
    });
  }

  // ------------------------------------------------------------------
  // Tool
  // ------------------------------------------------------------------

  async handleToolStart(
    tool: Serialized,
    input: string,
    runId: string,
    parentRunId?: string,
    tags?: string[],
    _metadata?: Record<string, unknown>,
    name?: string,
  ): Promise<void> {
    const startTime = this.recordStart(runId);
    const toolName = name ?? (tool.name as string | undefined) ?? tool.id?.[tool.id.length - 1] ?? "tool";
    this.names.set(runId, toolName);
    this.fire({
      id: runId,
      parent_id: parentRunId ?? null,
      session_id: this.getSession(runId, parentRunId),
      name: toolName,
      run_type: "tool",
      inputs: { input },
      start_time: startTime,
      tags: tags ?? [],
    });
  }

  async handleToolEnd(output: string, runId: string, parentRunId?: string): Promise<void> {
    const startTime = this.popStart(runId);
    const name = this.names.get(runId) ?? "tool";
    this.names.delete(runId);
    this.fire({
      id: runId,
      parent_id: parentRunId ?? null,
      session_id: this.lookupSession(runId) ?? null,
      name,
      run_type: "tool",
      outputs: { output },
      start_time: startTime,
      end_time: new Date().toISOString(),
    });
  }

  async handleToolError(err: Error, runId: string, parentRunId?: string): Promise<void> {
    const startTime = this.popStart(runId);
    const name = this.names.get(runId) ?? "tool";
    this.names.delete(runId);
    this.fire({
      id: runId,
      parent_id: parentRunId ?? null,
      session_id: this.lookupSession(runId) ?? null,
      name,
      run_type: "tool",
      error: err.message,
      start_time: startTime,
      end_time: new Date().toISOString(),
    });
  }

  // ------------------------------------------------------------------
  // Retriever
  // ------------------------------------------------------------------

  async handleRetrieverStart(
    retriever: Serialized,
    query: string,
    runId: string,
    parentRunId?: string,
    tags?: string[],
  ): Promise<void> {
    const startTime = this.recordStart(runId);
    const retrieverName = retriever.id?.[retriever.id.length - 1] ?? "retriever";
    this.names.set(runId, retrieverName);
    this.fire({
      id: runId,
      parent_id: parentRunId ?? null,
      session_id: this.getSession(runId, parentRunId),
      name: retrieverName,
      run_type: "retriever",
      inputs: { query },
      start_time: startTime,
      tags: tags ?? [],
    });
  }

  async handleRetrieverEnd(
    documents: unknown[],
    runId: string,
    parentRunId?: string,
  ): Promise<void> {
    const startTime = this.popStart(runId);
    const name = this.names.get(runId) ?? "retriever";
    this.names.delete(runId);
    this.fire({
      id: runId,
      parent_id: parentRunId ?? null,
      session_id: this.lookupSession(runId) ?? null,
      name,
      run_type: "retriever",
      outputs: { documents: documents.map(String) },
      start_time: startTime,
      end_time: new Date().toISOString(),
    });
  }

  async handleRetrieverError(err: Error, runId: string, parentRunId?: string): Promise<void> {
    const startTime = this.popStart(runId);
    const name = this.names.get(runId) ?? "retriever";
    this.names.delete(runId);
    this.fire({
      id: runId,
      parent_id: parentRunId ?? null,
      session_id: this.lookupSession(runId) ?? null,
      name,
      run_type: "retriever",
      error: err.message,
      start_time: startTime,
      end_time: new Date().toISOString(),
    });
  }
}
