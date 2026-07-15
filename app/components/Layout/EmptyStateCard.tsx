import type { ReactNode } from "react";
import Card from "./Card";

type EmptyStateCardProps = {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
};

export default function EmptyStateCard({
  icon,
  title,
  description,
  action,
}: EmptyStateCardProps) {
  return (
    <Card className="flex min-h-[220px] flex-col items-center justify-center border-dashed border-border/70 text-center" variant="glass">
      <div className="mb-4 rounded-2xl border border-border/70 bg-background/70 p-3 text-primary">
        {icon}
      </div>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </Card>
  );
}
