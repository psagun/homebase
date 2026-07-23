import { Construction } from "lucide-react";

export function ComingSoon({
  title,
  description,
  phase,
}: {
  title: string;
  description?: string;
  phase?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Construction className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        {description || `This module is coming soon.`}
      </p>
      {phase && (
        <span className="mt-3 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          {phase}
        </span>
      )}
    </div>
  );
}
