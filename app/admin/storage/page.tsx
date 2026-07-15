"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  MapPinned,
  PackageCheck,
  Warehouse,
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

type StorageRecord = {
  id: string;
  batch: string;
  location: string;
  quantity: number;
  updatedAt: string;
};

const SAMPLE_STORAGE: StorageRecord[] = [
  {
    id: "STOCK-001",
    batch: "20250311-A",
    location: "A-101",
    quantity: 24,
    updatedAt: "2025-03-11 09:00",
  },
  {
    id: "STOCK-002",
    batch: "20250311-B",
    location: "A-103",
    quantity: 16,
    updatedAt: "2025-03-11 09:20",
  },
  {
    id: "STOCK-003",
    batch: "20250311-C",
    location: "B-204",
    quantity: 32,
    updatedAt: "2025-03-11 09:45",
  },
  {
    id: "STOCK-004",
    batch: "20250311-D",
    location: "B-205",
    quantity: 18,
    updatedAt: "2025-03-11 10:05",
  },
];

export default function StorageListPage() {
  const ready = useAdminGuard();
  const { text, t } = useLocale();
  const records = useMemo(() => SAMPLE_STORAGE, []);
  const [searchValue, setSearchValue] = useState("");
  const [stockFilter, setStockFilter] = useState<"ALL" | "LOW" | "HEALTHY">(
    "ALL",
  );
  const [zoneFilter, setZoneFilter] = useState("ALL");

  const totalQuantity = useMemo(
    () => records.reduce((sum, item) => sum + item.quantity, 0),
    [records],
  );

  const lowStockCount = useMemo(
    () => records.filter((item) => item.quantity <= 18).length,
    [records],
  );

  const locationSummary = useMemo(() => {
    const counts = new Map<string, number>();
    for (const record of records) {
      const zone = record.location.split("-")[0] ?? record.location;
      counts.set(zone, (counts.get(zone) ?? 0) + record.quantity);
    }
    return [...counts.entries()].sort((left, right) => right[1] - left[1]);
  }, [records]);

  const latestUpdate = records.at(-1)?.updatedAt ?? "--";
  const filteredRecords = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    return records.filter((item) => {
      const zone = item.location.split("-")[0] ?? item.location;
      const matchesStock =
        stockFilter === "ALL" ||
        (stockFilter === "LOW" ? item.quantity <= 18 : item.quantity > 18);
      const matchesZone = zoneFilter === "ALL" || zone === zoneFilter;
      const matchesQuery =
        !query ||
        item.id.toLowerCase().includes(query) ||
        item.batch.toLowerCase().includes(query) ||
        item.location.toLowerCase().includes(query);
      return matchesStock && matchesZone && matchesQuery;
    });
  }, [records, searchValue, stockFilter, zoneFilter]);

  const replenishmentQueue = useMemo(
    () =>
      [...filteredRecords]
        .sort((left, right) => left.quantity - right.quantity)
        .slice(0, 4),
    [filteredRecords],
  );

  const handleExport = () => {
    if (!filteredRecords.length) {
      return;
    }
    exportToCsv({
      filename: buildExportFilename("storage"),
      header: [
        t("pages.admin.inspections.copy001"),
        t("pages.admin.storage.copy001"),
        t("pages.admin.storage.copy002"),
        t("pages.admin.storage.copy003"),
        t("pages.admin.storage.copy004"),
      ],
      rows: filteredRecords.map((item) => [
        item.id,
        item.batch,
        item.location,
        item.quantity,
        item.updatedAt,
      ]),
    });
  };

  if (!ready) {
    return (
      <PageLoadFallback
        fallbackHref="/admin"
        title={t("pages.admin.storage.copy005")}
        description={t("pages.admin.storage.copy006")}
      />
    );
  }

  return (
    <div className="page-shell pb-10 pt-0">
      <BackButton fallbackHref="/admin" />

      <WorkflowHero
        eyebrow={text("Stock Posture", "Stock Posture")}
        title={t("pages.admin.storage.copy005", undefined, "库存与库位态势台")}
        description={text(
          "库存页面应该帮助使用者先判断批次、库位和低库存风险，再进入行级记录确认。这样它才是库存态势页，而不是仓位日志页。",
          "Storage should explain stock posture and low-quantity pressure before raw row review."
        )}
        badgeVariant="info"
        stats={[
          {
            label: text("库存记录", "Stock records"),
            value: String(records.length),
            detail: text("当前库存条目", "Tracked stock items"),
            icon: <Boxes className="h-5 w-5" />,
          },
          {
            label: text("库存总量", "Total quantity"),
            value: String(totalQuantity),
            detail: text("用于判断整体供应压力", "Inventory posture"),
            tone: "success",
            icon: <PackageCheck className="h-5 w-5" />,
          },
          {
            label: text("低库存条目", "Low stock"),
            value: String(lowStockCount),
            detail: text("建议优先复核补货节奏", "Need replenishment attention"),
            tone: lowStockCount > 0 ? "warning" : "success",
            icon: <AlertTriangle className="h-5 w-5" />,
          },
          {
            label: text("最近更新", "Latest update"),
            value: latestUpdate,
            detail: text("用来判断盘点是否滞后", "Signals freshness"),
            icon: <Warehouse className="h-5 w-5" />,
          },
        ]}
        actions={
          <>
            <Button asChild>
              <Link href="/admin/data-import">
                {text("联动导入治理", "Open imports")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" onClick={handleExport}>
              {text("导出库存台账", "Export stock inventory")}
            </Button>
          </>
        }
        aside={
          <Card variant="glass" className="h-full border-border/70">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  {text("判断顺序", "Recommended order")}
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">
                  {text("先看风险，再看库位", "Risk first")}
                </h2>
              </div>
              <div className="space-y-3">
                {[
                  text("先看是否有低库存批次需要优先补货。", "Check low-stock batches first."),
                  text("再看库区分布是否集中到少数位置。", "Then confirm whether stock is over-concentrated in a zone."),
                  text("最后联动导入页确认是否是数据时效问题。", "Use imports to verify whether freshness is the real issue."),
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
        title={text("筛选与补货队列", "Filter and replenishment queue")}
        description={text(
          "这里参考 Carbon 的表格工具栏和导入治理节奏，把库区、低库存和批次搜索放到库存明细之前，先把补货压力缩小到可执行范围。",
          "Use search and stock filters to isolate replenishment pressure before scanning the full stock ledger."
        )}
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(18rem,0.9fr)]">
          <WorkbenchFilterBar
            eyebrow={text("库存工具栏", "Stock toolbar")}
            title={text("先锁定风险批次，再读库存台账", "Lock onto risky batches before reading the ledger")}
            description={text(
              "按库区、低库存和批次关键词快速收敛问题范围，让盘点与补货从重点项开始。",
              "Filter by zone, stock health, and batch keyword so replenishment starts from the right rows."
            )}
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            searchPlaceholder={text(
              "搜索库存编号、批次或库位",
              "Search stock ID, batch, or location",
            )}
            summary={text(
              `当前显示 ${filteredRecords.length} / ${records.length} 条库存记录`,
              `Showing ${filteredRecords.length} of ${records.length} stock records`,
            )}
            filters={[
              {
                id: "ALL",
                label: text("全部库存", "All stock"),
                count: records.length,
                active: stockFilter === "ALL",
                onClick: () => setStockFilter("ALL"),
              },
              {
                id: "LOW",
                label: text("低库存", "Low stock"),
                count: lowStockCount,
                active: stockFilter === "LOW",
                onClick: () => setStockFilter("LOW"),
              },
              {
                id: "HEALTHY",
                label: text("健康库存", "Healthy stock"),
                count: records.length - lowStockCount,
                active: stockFilter === "HEALTHY",
                onClick: () => setStockFilter("HEALTHY"),
              },
              ...locationSummary.map(([zone, quantity]) => ({
                id: zone,
                label: `${zone} ${text("区", "zone")}`,
                count: quantity,
                active: zoneFilter === zone,
                onClick: () => setZoneFilter(zone),
              })),
            ]}
            secondaryAction={
              <Button
                variant="outline"
                onClick={() => {
                  setSearchValue("");
                  setStockFilter("ALL");
                  setZoneFilter("ALL");
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
                  {text("补货优先队列", "Replenishment queue")}
                </p>
                <h3 className="mt-2 text-2xl font-black tracking-tight">
                  {text("数量最低的批次优先", "Lowest quantities first")}
                </h3>
              </div>
              <div className="space-y-3">
                {replenishmentQueue.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-border/70 bg-background/55 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <strong>{item.batch}</strong>
                      <Badge
                        variant={item.quantity <= 18 ? "warning" : "success"}
                      >
                        {item.quantity}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {item.location} · {item.updatedAt}
                    </p>
                  </div>
                ))}
                {!replenishmentQueue.length ? (
                  <p className="text-sm text-muted-foreground">
                    {text("当前筛选结果没有库存记录。", "No stock records match the current filter.")}
                  </p>
                ) : null}
              </div>
            </div>
          </Card>
        </div>
      </TaskSection>

      <TaskSection
        title={text("库位态势", "Storage posture")}
        description={text(
          "把总量和区域分布先讲清楚，再看单条库存记录，才符合仓储与运营判断路径。",
          "Explain quantity and zone distribution before row-level review."
        )}
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <Card variant="glass" className="border-border/70">
            <div className="mb-3 flex items-center justify-between">
              <strong>{text("库区分布", "Zone distribution")}</strong>
              <Badge variant="secondary">{locationSummary.length}</Badge>
            </div>
            <div className="space-y-3">
              {locationSummary.map(([zone, quantity]) => (
                <div
                  key={zone}
                  className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/55 px-4 py-3"
                >
                  <span className="font-medium">{zone}</span>
                  <Badge variant="info">{quantity}</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card variant="glass" className="border-border/70">
            <div className="mb-3 flex items-center justify-between">
              <strong>{text("补货关注项", "Restock watchlist")}</strong>
              <Badge variant={lowStockCount > 0 ? "warning" : "success"}>
                {lowStockCount}
              </Badge>
            </div>
            <div className="space-y-3">
              {records
                .filter((item) => item.quantity <= 18)
                .map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-border/70 bg-background/55 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <strong>{item.batch}</strong>
                      <Badge variant="warning">{item.quantity}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {item.location} · {item.updatedAt}
                    </p>
                  </div>
                ))}
              {lowStockCount === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {text("当前没有低库存条目。", "No low-stock items right now.")}
                </p>
              ) : null}
            </div>
          </Card>

          <Card variant="glass" className="border-border/70">
            <div className="space-y-4">
              <strong className="block text-lg">
                {text("跨页动作", "Where to continue")}
              </strong>
              <p className="text-sm leading-6 text-muted-foreground">
                {text(
                  "库存问题有时并不是仓储问题，而是导入延迟或规格台账不同步。这里应该明确给出继续排查的入口。",
                  "Stock posture often connects to imports and spec synchronization."
                )}
              </p>
              <Button asChild className="w-full justify-between">
                <Link href="/admin/data-import">
                  {text("查看导入历史", "Review imports")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-between">
                <Link href="/admin/wheels">
                  {text("查看规格台账", "Review wheel specs")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      </TaskSection>

      <TaskSection
        title={t("pages.admin.storage.copy007", undefined, "库存明细")}
        description={text(
          "明细表仍然保留，但它现在是用于核对批次和库位，不再承担整页的结构解释任务。",
          "The table remains for exact record verification, not overall explanation."
        )}
        action={<ExportButton onClick={handleExport} disabled={!records.length} />}
      >
        {!records.length ? (
          <EmptyStateCard
            icon={<MapPinned className="h-6 w-6" />}
            title={text("还没有库存记录", "No stock records yet")}
            description={text(
              "当仓储数据同步进来后，这里会成为库位复核和补货判断的核心页面。",
              "Storage records will appear here once warehouse data is synced."
            )}
          />
        ) : !filteredRecords.length ? (
          <EmptyStateCard
            icon={<MapPinned className="h-6 w-6" />}
            title={text("当前筛选没有匹配库存", "No matching stock records")}
            description={text(
              "调整库区、库存状态或搜索条件后，再继续查看库存台账。",
              "Adjust the zone, stock health, or search term to continue the stock review.",
            )}
          />
        ) : (
          <Card variant="glass" className="border-border/70 p-0">
            <Table>
              <TableCaption>
                {text(
                  `已根据当前筛选显示 ${filteredRecords.length} 条库存记录。`,
                  `${filteredRecords.length} filtered stock records are visible.`,
                )}
              </TableCaption>
              <TableHeader className="bg-card/70">
                <TableRow className="border-border/70">
                  <TableHead>{t("pages.admin.inspections.copy001")}</TableHead>
                  <TableHead>{t("pages.admin.storage.copy001")}</TableHead>
                  <TableHead>{t("pages.admin.storage.copy002")}</TableHead>
                  <TableHead>{t("pages.admin.storage.copy003")}</TableHead>
                  <TableHead>{t("pages.admin.storage.copy004")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((item) => (
                  <TableRow key={item.id} className="border-border/50">
                    <TableCell className="font-mono text-xs text-foreground">
                      {item.id}
                    </TableCell>
                    <TableCell>{item.batch}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.location}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={item.quantity <= 18 ? "warning" : "success"}
                      >
                        {item.quantity}
                      </Badge>
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
