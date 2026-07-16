import logoAsset from "@/assets/rei-dos-filtros-logo.jpg.asset.json";

interface BrandLogoProps {
  className?: string;
  compact?: boolean;
}

export function BrandLogo({ className = "", compact = false }: BrandLogoProps) {
  if (compact) {
    return (
      <div
        className={`flex size-9 items-center justify-center rounded-xl bg-primary font-extrabold text-primary-foreground shadow-elegant ${className}`}
      >
        R
      </div>
    );
  }

  return (
    <img
      src={logoAsset.url}
      alt="Rei dos Filtros — Filtros e Lubrificantes"
      className={`h-10 w-auto object-contain ${className}`}
    />
  );
}
