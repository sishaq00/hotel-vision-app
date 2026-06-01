// Guest documents tab: upload to Storage, list, view via signed URLs, delete.
import { useState } from "react";
import { FileText, Upload, Trash2, ExternalLink, Loader2, Paperclip } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useHotelStore, type GuestDocument } from "@/store/hotel-store";
import { uploadFile, getSignedUrl, removeFile } from "@/integrations/storage/hotel-storage";
import { useConfirm } from "@/components/system/ConfirmDialog";
import { toast } from "sonner";

interface Props {
  guestId: string;
}

export function GuestDocumentsTab({ guestId }: Props) {
  const guest = useHotelStore((s) => s.guests.find((g) => g.id === guestId));
  const updateGuest = useHotelStore((s) => s.updateGuest);
  const [uploading, setUploading] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);
  const confirm = useConfirm();
  const docs = guest?.documents ?? [];

  if (!guest) return null;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const next: GuestDocument[] = [...docs];
      for (const file of Array.from(files)) {
        const path = `${guestId}/${crypto.randomUUID()}-${file.name}`;
        const res = await uploadFile("guest-documents", file, path);
        if (!res.ok) {
          toast.error(`Failed to upload ${file.name}: ${res.error}`);
          continue;
        }
        next.push({
          id: crypto.randomUUID(),
          name: file.name,
          path: res.path,
          contentType: file.type,
          size: file.size,
          uploadedAt: new Date().toISOString(),
        });
      }
      updateGuest(guestId, { documents: next });
      toast.success("Documents uploaded");
    } finally {
      setUploading(false);
    }
  };

  const handleOpen = async (doc: GuestDocument) => {
    setOpening(doc.id);
    try {
      const url = await getSignedUrl("guest-documents", doc.path, 3600);
      if (!url) {
        toast.error("Could not generate link");
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setOpening(null);
    }
  };

  const handleDelete = async (doc: GuestDocument) => {
    const ok = await confirm({
      title: "Delete document?",
      description: `Remove "${doc.name}" permanently?`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    await removeFile("guest-documents", doc.path);
    updateGuest(guestId, { documents: docs.filter((d) => d.id !== doc.id) });
    toast.success("Document deleted");
  };

  return (
    <Card className="border-border/60 shadow-card">
      <div className="flex items-center justify-between gap-2 border-b border-border p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Paperclip className="h-4 w-4 text-primary" /> Documents · {docs.length}
        </div>
        <label>
          <input
            type="file"
            multiple
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <Button asChild size="sm" disabled={uploading}>
            <span className="cursor-pointer">
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Upload
            </span>
          </Button>
        </label>
      </div>

      {docs.length === 0 ? (
        <p className="p-8 text-center text-sm text-muted-foreground">
          No documents uploaded yet.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center gap-3 p-3">
              <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{d.name}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(d.uploadedAt).toLocaleString()}
                  {d.size ? ` · ${(d.size / 1024).toFixed(1)} KB` : ""}
                  {d.contentType ? ` · ${d.contentType}` : ""}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpen(d)}
                disabled={opening === d.id}
              >
                {opening === d.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                View
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(d)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
