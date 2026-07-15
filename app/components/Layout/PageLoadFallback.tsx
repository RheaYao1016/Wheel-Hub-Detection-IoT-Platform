"use client";

import { Loader2 } from "lucide-react";
import BackButton from "./BackButton";
import Card from "./Card";
import { Badge } from "../ui/Badge";
import SectionSkeleton from "./SectionSkeleton";

type PageLoadFallbackProps = {
  fallbackHref?: string;
  title?: string;
  description?: string;
};

export default function PageLoadFallback({
  fallbackHref = "/workspace",
  title = "Loading workspace",
  description = "Verifying your session and preparing the page layout...",
}: PageLoadFallbackProps) {
  const placeholders = [
    { label: "Layout", value: "..." },
    { label: "Session", value: "..." },
    { label: "Data", value: "..." },
  ];

  return (
    <div className="relative mx-auto max-w-[1920px] px-4 pb-16 pt-4 sm:px-6 lg:px-8">
      <BackButton fallbackHref={fallbackHref} />

      <section className="mb-6 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card to-popover p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1 space-y-2">
            <Badge variant="outline">Workspace Loading</Badge>
            <h1 className="text-3xl font-black tracking-tight lg:text-4xl">
              {title}
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
              {description}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 lg:min-w-[320px]">
            {placeholders.map((item) => (
              <Card key={item.label} className="p-3 text-center" variant="glass">
                <div className="text-xl font-black text-muted-foreground">
                  {item.value}
                </div>
                <div className="text-xs text-muted-foreground">{item.label}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <div className="space-y-6">
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{description}</p>
        </Card>
        <SectionSkeleton />
      </div>
    </div>
  );
}
