import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { previewCSVImport, confirmCSVImport } from "@/fns/import";
import type { ImportRow } from "@/server/services/import";

type Preview = { rows: ImportRow[]; duplicates: number };

export function ImportDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [imported, setImported] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const previewMutation = useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text();
      return previewCSVImport({ data: { csvText: text } });
    },
    onSuccess: (data) => {
      setPreview(data);
      setStep("preview");
    },
    onError: () => toast.error("Failed to parse CSV"),
  });

  const confirmMutation = useMutation({
    mutationFn: () => confirmCSVImport({ data: { rows: preview!.rows } }),
    onSuccess: (data) => {
      setImported(data.imported);
      setStep("done");
      qc.invalidateQueries({ queryKey: ["portfolio"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: () => toast.error("Import failed"),
  });

  function reset() {
    setStep("upload");
    setPreview(null);
    setImported(0);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <Upload className="size-3.5" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Trades from CSV</DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <p className="text-sm text-text-muted">
              Supports Trading212, Freetrade, and IBKR export formats. Duplicates are automatically
              detected and skipped.
            </p>
            <label className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed border-hairline p-8 transition-colors hover:border-text-muted">
              <Upload className="size-8 text-text-muted" />
              <span className="text-sm text-text-muted">Click to upload CSV</span>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) previewMutation.mutate(f);
                }}
              />
            </label>
            {previewMutation.isPending && (
              <p className="text-center text-sm text-text-muted">Parsing…</p>
            )}
          </div>
        )}

        {step === "preview" && preview && (
          <div className="space-y-4">
            <div className="flex gap-4 text-sm">
              <span className="text-text-body">{preview.rows.length} trades found</span>
              {preview.duplicates > 0 && (
                <span className="flex items-center gap-1 text-text-muted">
                  <AlertTriangle className="size-3.5" />
                  {preview.duplicates} duplicates will be skipped
                </span>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto rounded-lg border border-hairline">
              <table className="w-full text-xs">
                <thead className="border-b border-hairline bg-[var(--surface-elevated)]">
                  <tr>
                    {["Date", "Ticker", "Type", "Units", "Price"].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2 text-left font-mono uppercase tracking-wider text-text-muted"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {preview.rows.map((r, i) => (
                    <tr key={i} className={r.warning ? "opacity-40" : ""}>
                      <td className="px-3 py-2 text-text-muted">{r.date}</td>
                      <td className="px-3 py-2 font-semibold text-text-strong">{r.ticker}</td>
                      <td className="px-3 py-2 capitalize text-text-body">{r.type}</td>
                      <td className="px-3 py-2 text-text-body">{r.units}</td>
                      <td className="px-3 py-2 text-text-body">{r.price.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <CheckCircle2 className="size-10 text-[var(--up)]" />
            <p className="text-lg font-semibold text-text-strong">{imported} trades imported</p>
            <p className="text-sm text-text-muted">Your portfolio has been updated.</p>
          </div>
        )}

        <DialogFooter>
          {step === "preview" && (
            <>
              <Button variant="ghost" onClick={reset}>
                Back
              </Button>
              <Button onClick={() => confirmMutation.mutate()} disabled={confirmMutation.isPending}>
                {confirmMutation.isPending
                  ? "Importing…"
                  : `Import ${preview!.rows.filter((r) => !r.warning).length} trades`}
              </Button>
            </>
          )}
          {step === "done" && (
            <Button
              onClick={() => {
                setOpen(false);
                reset();
              }}
            >
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
