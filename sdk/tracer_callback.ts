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

interface TracerOptions {
  endpoint: string;
  project: string;
  apiKey: string;
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

  constructor({ endpoint, project, apiKey, routerDecisionKey = "routerDecision" }: TracerOptions) {
    super();
    this.endpoint = endpoint.replace(/\/$/, "");
    this.project = project;
    this.apiKey = apiKey;
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
    this.fire({
      id: runId,
      parent_id: parentRunId ?? null,
      session_id: this.getSession(runId, parentRunId),
      name: llm.id?.[llm.id.length - 1] ?? "llm",
      run_type: "llm",
      inputs: { prompts },
      start_time: startTime,
      tags: tags ?? [],
    });
  }

  async handleLLMEnd(output: LLMResult, runId: string, parentRunId?: string): Promise<void> {
    const startTime = this.popStart(runId);
    const llmOutput = output.llmOutput ?? {};
    const tokenUsage = (llmOutput.token_usage ?? llmOutput.tokenUsage ?? {}) as Record<string, number>;
    this.fire({
      id: runId,
      parent_id: parentRunId ?? null,
      session_id: this.lookupSession(runId) ?? null,
      name: "llm",
      run_type: "llm",
      outputs: {
        generations: output.generations.map((gen) =>
          gen.map((g) => ("text" in g ? g.text : String(g)))
        ),
      },
      start_time: startTime,
      end_time: new Date().toISOString(),
      extra: {
        model_name: llmOutput.model_name ?? llmOutput.modelName ?? null,
        prompt_tokens: tokenUsage.prompt_tokens ?? tokenUsage.promptTokens ?? null,
        completion_tokens: tokenUsage.completion_tokens ?? tokenUsage.completionTokens ?? null,
        total_tokens: tokenUsage.total_tokens ?? tokenUsage.totalTokens ?? null,
      },
    });
  }

  async handleLLMError(err: Error, runId: string, parentRunId?: string): Promise<void> {
    const startTime = this.popStart(runId);
    this.fire({
      id: runId,
      parent_id: parentRunId ?? null,
      session_id: this.lookupSession(runId) ?? null,
      name: "llm",
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
    this.fire({
      id: runId,
      parent_id: parentRunId ?? null,
      session_id: this.getSession(runId, parentRunId),
      name: name ?? chain.id?.[chain.id.length - 1] ?? "chain",
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
    const branchDecision =
      outputs && typeof outputs === "object"
        ? (outputs[this.routerDecisionKey] as string | undefined)
        : undefined;

    const payload: Payload = {
      id: runId,
      parent_id: parentRunId ?? null,
      session_id: this.lookupSession(runId) ?? null,
      name: "chain",
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
    this.fire({
      id: runId,
      parent_id: parentRunId ?? null,
      session_id: this.lookupSession(runId) ?? null,
      name: "chain",
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
    this.fire({
      id: runId,
      parent_id: parentRunId ?? null,
      session_id: this.getSession(runId, parentRunId),
      name: name ?? (tool.name as string | undefined) ?? tool.id?.[tool.id.length - 1] ?? "tool",
      run_type: "tool",
      inputs: { input },
      start_time: startTime,
      tags: tags ?? [],
    });
  }

  async handleToolEnd(output: string, runId: string, parentRunId?: string): Promise<void> {
    const startTime = this.popStart(runId);
    this.fire({
      id: runId,
      parent_id: parentRunId ?? null,
      session_id: this.lookupSession(runId) ?? null,
      name: "tool",
      run_type: "tool",
      outputs: { output },
      start_time: startTime,
      end_time: new Date().toISOString(),
    });
  }

  async handleToolError(err: Error, runId: string, parentRunId?: string): Promise<void> {
    const startTime = this.popStart(runId);
    this.fire({
      id: runId,
      parent_id: parentRunId ?? null,
      session_id: this.lookupSession(runId) ?? null,
      name: "tool",
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
    this.fire({
      id: runId,
      parent_id: parentRunId ?? null,
      session_id: this.getSession(runId, parentRunId),
      name: retriever.id?.[retriever.id.length - 1] ?? "retriever",
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
    this.fire({
      id: runId,
      parent_id: parentRunId ?? null,
      session_id: this.lookupSession(runId) ?? null,
      name: "retriever",
      run_type: "retriever",
      outputs: { documents: documents.map(String) },
      start_time: startTime,
      end_time: new Date().toISOString(),
    });
  }

  async handleRetrieverError(err: Error, runId: string, parentRunId?: string): Promise<void> {
    const startTime = this.popStart(runId);
    this.fire({
      id: runId,
      parent_id: parentRunId ?? null,
      session_id: this.lookupSession(runId) ?? null,
      name: "retriever",
      run_type: "retriever",
      error: err.message,
      start_time: startTime,
      end_time: new Date().toISOString(),
    });
  }
}
