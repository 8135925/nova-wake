import type { ErrorComponentProps } from "@tanstack/react-router";

export function AppErrorComponent({ error }: ErrorComponentProps) {
  const message = error instanceof Error ? error.message : String(error ?? "Unknown error");
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-muted text-xs tracking-widest uppercase">Something went wrong</p>
      <p className="max-w-md text-sm text-fg/80">{message}</p>
      <button
        type="button"
        className="mt-2 rounded-md bg-fg px-4 py-2 text-sm text-accent-fg"
        onClick={() => window.location.assign("/")}
      >
        Reload
      </button>
    </div>
  );
}
