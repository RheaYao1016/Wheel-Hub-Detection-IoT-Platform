import Card from "./Card";

type SectionSkeletonProps = {
  title?: string;
  blocks?: number;
};

export default function SectionSkeleton({
  title = "Loading section",
  blocks = 3,
}: SectionSkeletonProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="h-3 w-28 rounded-full bg-muted/70 animate-shimmer" />
        <div className="h-8 w-64 rounded-full bg-muted/70 animate-shimmer" />
        <div className="h-4 w-full max-w-2xl rounded-full bg-muted/60 animate-shimmer" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: blocks }).map((_, index) => (
          <Card key={`${title}-${index}`} variant="glass" className="space-y-4 border-border/60">
            <div className="h-5 w-20 rounded-full bg-muted/70 animate-shimmer" />
            <div className="h-8 w-40 rounded-full bg-muted/70 animate-shimmer" />
            <div className="h-4 w-full rounded-full bg-muted/60 animate-shimmer" />
            <div className="h-4 w-4/5 rounded-full bg-muted/60 animate-shimmer" />
            <div className="h-10 w-32 rounded-xl bg-muted/70 animate-shimmer" />
          </Card>
        ))}
      </div>
    </div>
  );
}
