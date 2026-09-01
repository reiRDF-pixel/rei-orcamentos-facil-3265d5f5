import { useRef, useState } from "react";
import { Upload, Trash2, Link2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ImageUploadFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  /** Largest side of the stored image, in pixels. */
  maxSize?: number;
  className?: string;
}

async function fileToOptimizedDataUrl(file: File, maxSize: number): Promise<string> {
  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo"));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Arquivo de imagem inválido"));
    image.src = rawDataUrl;
  });

  const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return rawDataUrl;
  ctx.drawImage(img, 0, 0, width, height);

  const keepsAlpha = file.type === "image/png" || file.type === "image/webp";
  if (!keepsAlpha) {
    // Flatten onto white so JPEG output never shows black corners.
    const flat = document.createElement("canvas");
    flat.width = width;
    flat.height = height;
    const flatCtx = flat.getContext("2d");
    if (flatCtx) {
      flatCtx.fillStyle = "#ffffff";
      flatCtx.fillRect(0, 0, width, height);
      flatCtx.drawImage(canvas, 0, 0);
      return flat.toDataURL("image/jpeg", 0.9);
    }
  }
  return canvas.toDataURL("image/png");
}

export function ImageUploadField({
  label,
  value,
  onChange,
  hint,
  maxSize = 600,
  className = "",
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [showUrl, setShowUrl] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem (PNG ou JPG)");
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await fileToOptimizedDataUrl(file, maxSize);
      onChange(dataUrl);
      toast.success("Imagem carregada — clique em salvar para confirmar");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao carregar imagem");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <Label>{label}</Label>
      <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-muted/20 p-3">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-background">
          {value ? (
            <img src={value} alt={label} className="max-h-full max-w-full object-contain" />
          ) : (
            <Upload className="size-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="size-4" /> {busy ? "Carregando..." : "Escolher arquivo"}
          </Button>
          {value && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
              <Trash2 className="size-4 text-destructive" /> Remover
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowUrl((s) => !s)}
            title="Usar um endereço da web"
          >
            <Link2 className="size-4" /> URL
          </Button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
      </div>
      {showUrl && (
        <Input
          placeholder="https://..."
          value={value.startsWith("data:") ? "" : value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
