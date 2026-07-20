import { Card } from "@/components/ui/card";
import { Sparkles, CheckCircle2 } from "lucide-react";

interface Props {
  title: string;
  description: string;
  nextSteps: string[];
}

export function ModulePlaceholder({ title, description, nextSteps }: Props) {
  return (
    <div className="mx-auto max-w-4xl p-6 lg:p-8">
      <header className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Módulo</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
      </header>

      <Card className="rounded-3xl border-border/60 p-8 shadow-elegant">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-accent/20 text-accent-foreground">
            <Sparkles className="size-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Em construção</p>
            <p className="text-xs text-muted-foreground">
              Módulo agendado para a próxima etapa do MVP.
            </p>
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            O que virá aqui
          </p>
          <ul className="space-y-2">
            {nextSteps.map((s) => (
              <li
                key={s}
                className="flex items-start gap-3 rounded-xl bg-muted/40 p-3 text-sm text-foreground"
              >
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </div>
  );
}
