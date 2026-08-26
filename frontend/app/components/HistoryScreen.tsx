"use client";

import { useEffect, useState } from "react";
import { ApiError, deleteDocument, listDocuments, type DocumentSummary } from "@/lib/api";

interface Props {
  onOpen: (documentId: string) => void;
  onBack: () => void;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_STYLES: Record<string, string> = {
  processed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  processing: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  failed: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
};

export default function HistoryScreen({ onOpen, onBack }: Props) {
  const [documents, setDocuments] = useState<DocumentSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    listDocuments()
      .then(setDocuments)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Something went wrong."));
  }, []);

  async function handleDelete(documentId: string) {
    setDeletingId(documentId);
    try {
      await deleteDocument(documentId);
      setDocuments((current) => current?.filter((d) => d.document_id !== documentId) ?? current);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete this document.");
    } finally {
      setDeletingId(null);
      setPendingDeleteId(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Previous documents
        </h1>
        <button
          onClick={onBack}
          className="shrink-0 rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          Upload new
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {documents === null && !error && (
        <p className="mt-6 text-sm text-zinc-400">Loading…</p>
      )}

      {documents && documents.length === 0 && (
        <p className="mt-6 text-sm text-zinc-400">
          No documents uploaded yet.
        </p>
      )}

      <ul className="mt-6 space-y-3">
        {documents?.map((doc) => (
          <li
            key={doc.document_id}
            className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                    {doc.filename}
                  </p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      STATUS_STYLES[doc.status] ??
                      "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}
                  >
                    {doc.status}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-zinc-400">{formatDate(doc.uploaded_at)}</p>
                {doc.summary && (
                  <p className="mt-1.5 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {doc.summary}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <button
                  onClick={() => onOpen(doc.document_id)}
                  className="rounded-full bg-brand px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                >
                  Open
                </button>
                {pendingDeleteId === doc.document_id ? (
                  <button
                    onClick={() => handleDelete(doc.document_id)}
                    disabled={deletingId === doc.document_id}
                    className="rounded-full border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                  >
                    {deletingId === doc.document_id ? "Deleting…" : "Confirm delete"}
                  </button>
                ) : (
                  <button
                    onClick={() => setPendingDeleteId(doc.document_id)}
                    className="rounded-full px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
