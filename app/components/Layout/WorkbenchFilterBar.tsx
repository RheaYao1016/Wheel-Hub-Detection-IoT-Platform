"use client";

import type { ReactNode } from "react";
import { Search } from "lucide-react";
import Card from "./Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { cn } from "@/lib/utils";

type FilterChip = {
  id: string;
  label: string;
  count?: number;
  active?: boolean;
  onClick: () => void;
};

type WorkbenchFilterBarProps = {
  eyebrow?: string;
  title: string;
  description: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  filters?: FilterChip[];
  summary?: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
};

export default function WorkbenchFilterBar({
  eyebrow,
  title,
  description,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  filters = [],
  summary,
  action,
  secondaryAction,
}: WorkbenchFilterBarProps) {
  return (
    <Card variant="glass" className="border-border/70">
      <div className="space-y-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-2">
            {eyebrow ? (
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {eyebrow}
              </p>
            ) : null}
            <div className="space-y-1">
              <h3 className="text-2xl font-black tracking-tight">{title}</h3>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            </div>
          </div>

          {action || secondaryAction ? (
            <div className="flex flex-wrap gap-3">
              {secondaryAction}
              {action}
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-12 rounded-2xl border-border/70 bg-background/60 pl-11"
            />
          </div>

          {summary ? (
            <div className="rounded-2xl border border-border/70 bg-background/55 px-4 py-3 text-sm text-muted-foreground">
              {summary}
            </div>
          ) : null}
        </div>

        {filters.length ? (
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <Button
                key={filter.id}
                type="button"
                variant={filter.active ? "default" : "outline"}
                className={cn(
                  "rounded-full px-4",
                  !filter.active && "border-border/70 bg-background/40",
                )}
                onClick={filter.onClick}
              >
                <span>{filter.label}</span>
                {typeof filter.count === "number" ? (
                  <Badge
                    variant={filter.active ? "glow" : "secondary"}
                    className="ml-1"
                  >
                    {filter.count}
                  </Badge>
                ) : null}
              </Button>
            ))}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
