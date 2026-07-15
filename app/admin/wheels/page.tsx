"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  CircleGauge,
  PackageSearch,
  RefreshCw,
  Ruler,
  ShieldCheck,
} from "lucide-react";
import BackButton from "../../components/Layout/BackButton";
import Card from "../../components/Layout/Card";
import EmptyStateCard from "../../components/Layout/EmptyStateCard";
import PageLoadFallback from "../../components/Layout/PageLoadFallback";
import TaskSection from "../../components/Layout/TaskSection";
import WorkbenchFilterBar from "../../components/Layout/WorkbenchFilterBar";
import WorkflowHero from "../../components/Layout/WorkflowHero";
import { Badge } from "@/app/components/ui/Badge";
import { Button } from "@/app/components/ui/Button";
import ExportButton from "@/app/components/Controls/ExportButton";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/Table";
import { buildExportFilename, exportToCsv } from "@/app/utils/export";
import { useLocale } from "@/app/components/Locale/LocaleProvider";
import { useAdminGuard } from "../hooks/useAdminGuard";

type WheelRecord = {
  id: string;
  diameter: string;
  width: string;
  boltPattern: string;
  updatedAt: string;
};

const SAMPLE_WHEELS: WheelRecord[] = [
  {
    id: "WH-2025-0001",
    diameter: '18"',
    width: '7.5"',
    boltPattern: "5x114.3",
    updatedAt: "2025-03-11 08:35",
  },
  {
    id: "WH-2025-0002",
    diameter: '19"',
    width: '8"',
    boltPattern: "5x112",
    updatedAt: "2025-03-11 08:48",
  },
  {
    id: "WH-2025-0003",
    diameter: '20"',
    width: '8.5"',
    boltPattern: "5x120",
    updatedAt: "2025-03-11 09:15",
  },
  {
    id: "WH-2025-0004",
    diameter: '17"',
    width: '7"',
    boltPattern: "5x100",
    updatedAt: "2025-03-11 09:42",
  },
  {
    id: "WH-2025-0005",
    diameter: '18"',
    width: '8"',
    boltPattern: "5x114.3",
    updatedAt: "2025-03-11 10:02",
  },
];

export default function WheelListPage() {
  const ready = useAdminGuard();
  const { text, t } = useLocale();
  const records = useMemo(() => SAMPLE_WHEELS, []);
  const [searchValue, setSearchValue] = useState("");
  const [activePattern, setActivePattern] = useState("all");

  const boltPatternSummary = useMemo(() => {
    const counts = new Map<string, number>();
    for (const record of records) {
      counts.set(record.boltPattern, (counts.get(record.boltPattern) ?? 0) + 1);
    }
    return [...counts.entries()].sort((left, right) => right[1] - left[1]);
  }, [records]);

  const diameterSummary = useMemo(() => {
    const counts = new Map<string, number>();
    for (const record of records) {
      counts.set(record.diameter, (counts.get(record.diameter) ?? 0) + 1);
    }
    return [...counts.entries()].sort((left, right) => right[1] - left[1]);
  }, [records]);

  const mostCommonPattern = boltPatternSummary[0];
  const mostCommonDiameter = diameterSummary[0];
  const latestUpdate = records.at(-1)?.updatedAt ?? "--";
  const filteredRecords = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    return records.filter((item) => {
      const matchesPattern =
        activePattern === "all" || item.boltPattern === activePattern;
      const matchesQuery =
        !query ||
        item.id.toLowerCase().includes(query) ||
        item.diameter.toLowerCase().includes(query) ||
        item.width.toLowerCase().includes(query) ||
        item.boltPattern.toLowerCase().includes(query);
      return matchesPattern && matchesQuery;
    });
  }, [activePattern, records, searchValue]);

  const newestRecords = useMemo(
    () =>
      [...filteredRecords]
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
        .slice(0, 3),
    [filteredRecords],
  );

  const patternFocus = useMemo(() => {
    const dominantPatterns = boltPatternSummary
      .filter(([, count]) => count >= 2)
      .slice(0, 3)
      .map(([pattern]) => pattern);

    return records.filter((item) => dominantPatterns.includes(item.boltPattern));
  }, [boltPatternSummary, records]);

  const handleExport = () => {
    if (!filteredRecords.length) {
      return;
    }
    exportToCsv({
      filename: buildExportFilename("wheels"),
      header: [
        t("pages.admin.wheels.copy001"),
        t("pages.admin.wheels.copy002"),
        t("pages.admin.wheels.copy003"),
        t("pages.admin.wheels.copy004"),
        t("pages.admin.storage.copy004"),
      ],
      rows: filteredRecords.map((item) => [
        item.id,
        item.diameter,
        item.width,
        item.boltPattern,
        item.updatedAt,
      ]),
    });
  };

  if (!ready) {
    return (
      <PageLoadFallback
        fallbackHref="/admin"
        title={t("pages.admin.wheels.copy005")}
        description={t("pages.admin.wheels.copy006")}
      />
    );
  }

  return (
    <div className="page-shell pb-10 pt-0">
      <BackButton fallbackHref="/admin" />

      <WorkflowHero
        eyebrow={text("Spec Inventory", "Spec Inventory")}
        title={t("pages.admin.wheels.copy005", undefined, "轮毂规格资产台账")}
        description={text(
          "这页负责维护轮毂规格的结构化台账，不只是导出一张表。先看主流规格分布和更新时间，再进入明细，工程师和管理员可以更快判断哪些规格值得继续追踪。",
          "Maintain wheel specifications as a structured inventory rather than a plain export table."
        )}
        badgeVariant="info"
        stats={[
          {
            label: text("规格记录", "Records"),
            value: String(records.length),
            detail: text("当前可复核的规格条目", "Current spec entries"),
            icon: <PackageSearch className="h-5 w-5" />,
          },
          {
            label: text("主流孔距", "Top bolt pattern"),
            value: mostCommonPattern?.[0] ?? "--",
            detail: mostCommonPattern
              ? text(`${mostCommonPattern[1]} 条记录`, `${mostCommonPattern[1]} records`)
              : text("暂无统计", "No data"),
            tone: "info",
            icon: <CircleGauge className="h-5 w-5" />,
          },
          {
            label: text("主流直径", "Top diameter"),
            value: mostCommonDiameter?.[0] ?? "--",
            detail: mostCommonDiameter
              ? text(`${mostCommonDiameter[1]} 条记录`, `${mostCommonDiameter[1]} records`)
              : text("暂无统计", "No data"),
            tone: "success",
            icon: <Ruler className="h-5 w-5" />,
          },
          {
            label: text("最近更新", "Latest update"),
            value: latestUpdate,
            detail: text("用来判断规格维护是否滞后", "Signals freshness"),
            icon: <RefreshCw className="h-5 w-5" />,
          },
        ]}
        actions={
          <>
            <Button asChild>
              <Link href="/admin/inspections">
                {text("联动看检测记录", "Open inspections")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" onClick={handleExport}>
              {text("导出台账", "Export inventory")}
            </Button>
          </>
        }
        aside={
          <Card variant="glass" className="h-full border-border/70">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  {text("维护顺序", "Recommended order")}
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">
                  {text("先看分布，再核明细", "Review posture before detail")}
                </h2>
              </div>
              <div className="space-y-3">
                {[
                  text("先看是否出现异常集中的孔距或尺寸家族。", "Check whether one size family dominates unexpectedly."),
                  text("再确认最近更新是否过旧，避免老规格继续沿用。", "Confirm the inventory is still fresh enough."),
                  text("最后联动检测记录和库存台账确认影响范围。", "Then connect it with inspections and storage."),
                ].map((item, index) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/55 p-4"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-sm font-black text-primary">
                      {index + 1}
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        }
      />

      <TaskSection
        title={text("筛选与关注队列", "Filter and focus queue")}
        description={text(
          "这里借鉴了 Carbon data table 的工具栏思路，把搜索、规格过滤和近期更新放在表格前，先帮工程师缩小判断范围。",
          "Filter by pattern and recent changes before scanning the full inventory."
        )}
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(18rem,0.9fr)]">
          <WorkbenchFilterBar
            eyebrow={text("规格工具栏", "Spec toolbar")}
            title={text("先缩小范围，再读台账", "Narrow the scope before reading rows")}
            description={text(
              "按孔距家族和关键词快速聚焦相关规格，减少在完整台账里来回扫描的时间。",
              "Use bolt-pattern filters and search to focus the inventory before opening the full table."
            )}
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            searchPlaceholder={text(
              "搜索规格编号、直径、宽度或孔距",
              "Search ID, diameter, width, or bolt pattern",
            )}
            summary={text(
              `当前显示 ${filteredRecords.length} / ${records.length} 条规格`,
              `Showing ${filteredRecords.length} of ${records.length} records`,
            )}
            filters={[
              {
                id: "all",
                label: text("全部规格", "All specs"),
                count: records.length,
                active: activePattern === "all",
                onClick: () => setActivePattern("all"),
              },
              ...boltPatternSummary.map(([pattern, count]) => ({
                id: pattern,
                label: pattern,
                count,
                active: activePattern === pattern,
                onClick: () => setActivePattern(pattern),
              })),
            ]}
            secondaryAction={
              <Button
                variant="outline"
                onClick={() => {
                  setSearchValue("");
                  setActivePattern("all");
                }}
              >
                {text("重置筛选", "Reset filters")}
              </Button>
            }
            action={
              <Button variant="outline" onClick={handleExport}>
                {text("导出当前结果", "Export current result")}
              </Button>
            }
          />

          <Card variant="glass" className="border-border/70">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  {text("近期变更", "Recent changes")}
                </p>
                <h3 className="mt-2 text-2xl font-black tracking-tight">
                  {text("优先复核最新规格", "Review newest specs first")}
                </h3>
              </div>
              <div className="space-y-3">
                {newestRecords.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-border/70 bg-background/55 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <strong>{item.id}</strong>
                      <Badge variant="outline">{item.boltPattern}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {item.diameter} · {item.width} · {item.updatedAt}
                    </p>
                  </div>
                ))}
                {!newestRecords.length ? (
                  <p className="text-sm text-muted-foreground">
                    {text("当前筛选结果没有规格。", "No records match the current filter.")}
                  </p>
                ) : null}
              </div>
            </div>
          </Card>
        </div>
      </TaskSection>

      <TaskSection
        title={text("规格概览", "Specification overview")}
        description={text(
          "在进入明细表之前，先用几个聚类视角解释这批轮毂记录的结构，这比一上来扫表格更符合工程判断路径。",
          "Summarize the inventory shape before reading raw rows."
        )}
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <Card variant="glass" className="border-border/70">
            <div className="mb-3 flex items-center justify-between">
              <strong>{text("孔距聚类", "Bolt pattern clusters")}</strong>
              <Badge variant="secondary">{boltPatternSummary.length}</Badge>
            </div>
            <div className="space-y-3">
              {boltPatternSummary.map(([pattern, count]) => (
                <div
                  key={pattern}
                  className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/55 px-4 py-3"
                >
                  <span className="font-medium">{pattern}</span>
                  <Badge variant="info">{count}</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card variant="glass" className="border-border/70">
            <div className="mb-3 flex items-center justify-between">
              <strong>{text("直径族群", "Diameter families")}</strong>
              <Badge variant="secondary">{diameterSummary.length}</Badge>
            </div>
            <div className="space-y-3">
              {diameterSummary.map(([diameter, count]) => (
                <div
                  key={diameter}
                  className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/55 px-4 py-3"
                >
                  <span className="font-medium">{diameter}</span>
                  <Badge variant="success">{count}</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card variant="glass" className="border-border/70">
            <div className="space-y-4">
              <strong className="block text-lg">
                {text("重点规格关注", "Spec focus set")}
              </strong>
              <p className="text-sm leading-6 text-muted-foreground">
                {text(
                  "当同一孔距族群持续扩张时，更适合优先确认它是否已经同步到检测和库存页面，避免规格台账与实际生产脱节。",
                  "Dominant pattern families should be checked across inspections and storage before they drift from production reality."
                )}
              </p>
              <div className="space-y-3">
                {patternFocus.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-border/70 bg-background/55 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <strong>{item.id}</strong>
                      <Badge variant="info">{item.boltPattern}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {item.diameter} · {item.width}
                    </p>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <Button asChild className="w-full justify-between">
                  <Link href="/admin/inspections">
                    {text("去看检测记录", "Review inspections")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-between">
                  <Link href="/admin/storage">
                    {text("去看库存映射", "Review storage")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </TaskSection>

      <TaskSection
        title={t("pages.admin.wheels.copy007", undefined, "轮毂规格明细")}
        description={text(
          "明细表放在概览之后，用于精确核对单条规格，而不是承担整页的信息解释职责。",
          "The table is for precise verification after the high-level framing."
        )}
        action={<ExportButton onClick={handleExport} disabled={!records.length} />}
      >
        {!records.length ? (
          <EmptyStateCard
            icon={<ShieldCheck className="h-6 w-6" />}
            title={text("还没有轮毂规格记录", "No wheel records yet")}
            description={text(
              "当规格数据进入后台后，这里会成为规格复核与跨页面追踪的基础台账。",
              "This will become the base inventory for spec review."
            )}
          />
        ) : !filteredRecords.length ? (
          <EmptyStateCard
            icon={<ShieldCheck className="h-6 w-6" />}
            title={text("当前筛选没有匹配规格", "No matching wheel specs")}
            description={text(
              "调整孔距筛选或搜索条件后，再继续查看规格台账。",
              "Adjust the bolt-pattern filter or search term to continue reviewing specs.",
            )}
          />
        ) : (
          <Card variant="glass" className="border-border/70 p-0">
            <Table>
              <TableCaption>
                {text(
                  `已根据当前筛选显示 ${filteredRecords.length} 条规格记录。`,
                  `${filteredRecords.length} filtered wheel records are visible.`,
                )}
              </TableCaption>
              <TableHeader className="bg-card/70">
                <TableRow className="border-border/70">
                  <TableHead>{t("pages.admin.wheels.copy001")}</TableHead>
                  <TableHead>{t("pages.admin.wheels.copy002")}</TableHead>
                  <TableHead>{t("pages.admin.wheels.copy003")}</TableHead>
                  <TableHead>{t("pages.admin.wheels.copy004")}</TableHead>
                  <TableHead>{t("pages.admin.storage.copy004")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((item) => (
                  <TableRow key={item.id} className="border-border/50">
                    <TableCell className="font-mono text-xs text-foreground">
                      {item.id}
                    </TableCell>
                    <TableCell>{item.diameter}</TableCell>
                    <TableCell>{item.width}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.boltPattern}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.updatedAt}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </TaskSection>
    </div>
  );
}
