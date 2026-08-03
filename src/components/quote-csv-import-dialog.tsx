import { useRef, useState } from "react";
import { Upload, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { parseQuoteItemsCsv } from "@/lib/quote-csv";
import type { QuoteItemDraft } from "@/lib/quote";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startOrdem: number;
  onImport: (items: QuoteItemDraft[]) => void;
}

export function QuoteCsvImportDialog({ open, onOpenChange, startOrdem, onImport }: Props) {
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleFile = async (file: File) => {
    const content = await file.text();
    setText(content);
  };

  const handleImport = () => {
    const items = parseQuoteItemsCsv(text, startOrdem);
    if (items.length === 0) {
      toast.error("Nenhum item válido encontrado no conteúdo informado");
      return;
    }
    onImport(items);
    toast.success(`${items.length} ${items.length === 1 ? "item" : "itens"} importados`);
    setText("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar itens de CSV / Excel</DialogTitle>
          <DialogDescription>
            Cole as linhas copiadas do Excel ou envie um arquivo .csv. Colunas aceitas:
            <b> Código, Nosso código, Marca, Descrição, Quantidade, Preço</b>. Se não houver
            cabeçalho, essa ordem é assumida.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt,.tsv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => fileRef.current?.click()}
          >
            <FileSpreadsheet className="size-4" /> Escolher arquivo CSV
          </Button>
          <Textarea
            rows={10}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"CODIGO;NOSSO CODIGO;MARCA;DESCRICAO;QTD;PRECO\nW1160;FO-1160;MANN;Filtro de óleo;2;89,90"}
            className="font-mono text-xs"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleImport} disabled={!text.trim()}>
            <Upload className="size-4" /> Importar itens
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
