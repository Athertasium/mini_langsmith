"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateProjectForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const inputStyle: React.CSSProperties = {
    background: "var(--bg-deep)",
    border: "1px solid var(--border-strong)",
    color: "var(--text-primary)",
    outline: "none",
    transition: "border-color 150ms",
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setError(data.error ?? "Failed to create project");
        return;
      }
      setName("");
      setDescription("");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Project name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="flex-1 rounded-md px-3 py-2 text-sm"
          style={inputStyle}
          onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--accent)"; }}
          onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--border-strong)"; }}
        />
        <input
          type="text"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="flex-1 rounded-md px-3 py-2 text-sm"
          style={inputStyle}
          onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--accent)"; }}
          onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--border-strong)"; }}
        />
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="rounded-md px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-40 cursor-pointer"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          {loading ? "Creating…" : "Create"}
        </button>
      </div>
      {error && (
        <p className="text-xs" style={{ color: "var(--error-color)" }}>
          {error}
        </p>
      )}
    </form>
  );
}
