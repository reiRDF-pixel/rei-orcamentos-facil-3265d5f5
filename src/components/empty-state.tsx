import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="relative mb-5 flex size-20 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-primary/10" />
        <span className="absolute inset-3 rounded-full bg-accent/15" />
        <Icon className="relative size-8 text-primary" strokeWidth={1.75} />
      </div>
      <h3 className="text-base font-bold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
