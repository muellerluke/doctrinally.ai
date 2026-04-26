"use client";

import * as React from "react";

export interface UploadItem {
  id: string;
  filename: string;
  progress: number;
  status: "queued" | "uploading" | "complete" | "error";
  error?: string;
}

export interface UploadContextValue {
  uploads: UploadItem[];
  addUpload: (item: UploadItem) => void;
  startUpload: (id: string) => void;
  updateProgress: (id: string, progress: number) => void;
  completeUpload: (id: string) => void;
  failUpload: (id: string, error: string) => void;
  removeUpload: (id: string) => void;
}

type UploadAction =
  | { type: "ADD"; item: UploadItem }
  | { type: "START"; id: string }
  | { type: "PROGRESS"; id: string; progress: number }
  | { type: "COMPLETE"; id: string }
  | { type: "FAIL"; id: string; error: string }
  | { type: "REMOVE"; id: string };

function uploadReducer(state: UploadItem[], action: UploadAction): UploadItem[] {
  switch (action.type) {
    case "ADD":
      return [...state, action.item];
    case "START":
      return state.map((u) =>
        u.id === action.id ? { ...u, status: "uploading" } : u
      );
    case "PROGRESS":
      return state.map((u) =>
        u.id === action.id ? { ...u, progress: action.progress } : u
      );
    case "COMPLETE":
      return state.map((u) =>
        u.id === action.id ? { ...u, status: "complete", progress: 100 } : u
      );
    case "FAIL":
      return state.map((u) =>
        u.id === action.id ? { ...u, status: "error", error: action.error } : u
      );
    case "REMOVE":
      return state.filter((u) => u.id !== action.id);
    default:
      return state;
  }
}

const UploadContext = React.createContext<UploadContextValue | null>(null);

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [uploads, dispatch] = React.useReducer(uploadReducer, []);

  const value = React.useMemo<UploadContextValue>(
    () => ({
      uploads,
      addUpload: (item) => dispatch({ type: "ADD", item }),
      startUpload: (id) => dispatch({ type: "START", id }),
      updateProgress: (id, progress) =>
        dispatch({ type: "PROGRESS", id, progress }),
      completeUpload: (id) => dispatch({ type: "COMPLETE", id }),
      failUpload: (id, error) => dispatch({ type: "FAIL", id, error }),
      removeUpload: (id) => dispatch({ type: "REMOVE", id }),
    }),
    [uploads]
  );

  return (
    <UploadContext.Provider value={value}>{children}</UploadContext.Provider>
  );
}

export function useUploads() {
  const ctx = React.useContext(UploadContext);
  if (!ctx) {
    throw new Error("useUploads must be used within an UploadProvider");
  }
  return ctx;
}
