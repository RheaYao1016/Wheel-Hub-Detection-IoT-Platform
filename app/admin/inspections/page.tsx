"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Radar,
  ShieldAlert,
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

type InspectionRecord = {
  id: string;
  wheelId: string;
  result: "PASS" | "FAIL";
  station: string;
  operator: string;
  finishedAt: string;
};

const SAMPLE_INSPECTIONS: InspectionRecord[] = [
  {
    id: "INSP-2025-3101",
    wheelId: "WH-2025-0001",
    result: "PASS",
    station: "ST-01",
    operator: "李雷",
    finishedAt: "2025-03-11 08:42",
  },
  {
    id: "INSP-2025-3102",
    wheelId: "WH-2025-0002",
    result: "PASS",
    station: "ST-02",
    operator: "韩梅梅",
    finishedAt: "2025-03-11 08:55",
  },
  {
    id: "INSP-2025-3103",
    wheelId: "WH-2025-0003",
    result: "FAIL",
    station: "ST-03",
    operator: "张伟",
    finishedAt: "2025-03-11 09:14",
  },
  {
    id: "INSP-2025-3104",
    wheelId: "WH-2025-0004",
    result: "PASS",
    station: "ST-02",
    operator: "刘洋",
    finishedAt: "2025-03-11 09:36",
  },
  {
    id: "INSP-2025-3105",
    wheelId: "WH-2025-0005",
    result: "PASS",
    station: "ST-01",
    operator: "赵敏",
    finishedAt: "2025-03-11 09:58",
  },
];

export default function InspectionListPage() {
  const ready = useAdminGuard();
  const { text, t } = useLocale();
  const records = useMemo(() => SAMPLE_INSPECTIONS, []);
  const [searchValue, setSearchValue] = useState("");
  const [resultFilter, setResultFilter] = useState<"ALL" | "PASS" | "FAIL">(
    "ALL",
  );
  const [stationFilter, setStationFilter] = useState("ALL");

  const failCount = useMemo(
    () => records.filter((item) => item.result === "FAIL").length,
    [records],
  );
  const passRate = useMemo(() => {
    if (!records.length) {
      return "0%";
    }
    return `${(((records.length - failCount) / records.length) * 100).toFixed(1)}%`;
  }, [failCount, records.length]);

  const stationSummary = useMemo(() => {
    const counts = new Map<string, number>();
    for (const record of records) {
      counts.set(record.station, (counts.get(record.station) ?? 0) + 1);
    }
    return [...counts.entries()].sort((left, right) => right[1] - left[1]);
  }, [records]);

  const operatorSummary = useMemo(() => {
    const counts = new Map<string, number>();
    for (const record of records) {
      counts.set(record.operator, (counts.get(record.operator) ?? 0) + 1);
    }
    return [...counts.entries()].sort((left, right) => right[1] - left[1]);
  }, [records]);

  const filteredRecords = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    return records.filter((item) => {
      const matchesResult =
        resultFilter === "ALL" || item.result === resultFilter;
      const matchesStation =
        stationFilter === "ALL" || item.station === stationFilter;
      const matchesQuery =
        !query ||
        item.id.toLowerCase().includes(query) ||
        item.wheelId.toLowerCase().includes(query) ||
        item.operator.toLowerCase().includes(query) ||
        item.station.toLowerCase().includes(query);
      return matchesResult && matchesStation && matchesQuery;
    });
  }, [records, resultFilter, searchValue, stationFilter]);

  const reviewQueue = useMemo(
    () =>
      [...filteredRecords]
        .sort((left, right) => {
          if (left.result !== right.result) {
            return left.result === "FAIL" ? -1 : 1;
          }
          return right.finishedAt.localeCompare(left.finishedAt);
        })
        .slice(0, 4),
    [filteredRecords],
  );

  const handleExport = () => {
    if (!filteredRecords.length) {
      return;
    }
    exportToCsv({
      filename: buildExportFilename("inspections"),
      header: [
        t("pages.admin.inspections.copy001"),
        t("pages.admin.inspections.copy002"),
        t("pages.admin.inspections.copy003"),
        t("pages.admin.alerts.copy014"),
        t("pages.admin.inspections.copy004"),
        t("pages.admin.inspections.copy005"),
      ],
      rows: filteredRecords.map((item) => [
        item.id,
        item.wheelId,
        item.result,
        item.station,
        item.operator,
        item.finishedAt,
      ]),
    });
  };

  if (!ready) {
    return (
      <PageLoadFallback
        fallbackHref="/admin"
        title={t("pages.admin.inspections.copy006")}
        description={t("pages.admin.inspections.copy007")}
      />
    );
  }

  return (
    <div className="page-shell pb-10 pt-0">
      <BackButton fallbackHref="/admin" />

      <WorkflowHero
        eyebrow={text("Quality Review", "Quality Review")}
        title={t("pages.admin.inspections.copy006", undefined, "检测记录复核台")}
        description={text(
          "检测记录页应该先帮助管理员和工程师判断失败率、热点工位和操作者压力，再进入逐条复核，而不是直接把所有检测结果塞进一张表里。",
          "Inspection records should explain quality pressure before forcing users into a raw table."
        )}
        badgeVariant="warning"
        stats={[
          {
            label: text("检测总量", "Inspections"),
            value: String(records.length),
            detail: text("当前可复核记录", "Current reviewable records"),
            icon: <ClipboardCheck className="h-5 w-5" />,
          },
          {
            label: text("通过率", "Pass rate"),
            value: passRate,
            detail: text("比单看失败数量更直观", "A quick quality posture view"),
            tone: failCount > 0 ? "warning" : "success",
            icon: <CheckCircle2 className="h-5 w-5" />,
          },
          {
            label: text("失败记录", "Failures"),
            value: String(failCount),
            detail: text("决定是否升级到告警面", "May require escalation"),
            tone: failCount > 0 ? "warning" : "success",
            icon: <AlertTriangle className="h-5 w-5" />,
          },
          {
            label: text("活跃工位", "Active stations"),
            value: String(stationSummary.length),
            detail: text("帮助定位检测压力分布", "Shows where pressure is concentrated"),
            icon: <Radar className="h-5 w-5" />,
          },
        ]}
        actions={
          <>
            <Button asChild>
              <Link href="/admin/alerts">
                {text("联动告警队列", "Open alert queue")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" onClick={handleExport}>
              {text("导出检测记录", "Export inspections")}
            </Button>
          </>
        }
        aside={
          <Card variant="glass" className="h-full border-border/70">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  {text("复核顺序", "Recommended order")}
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">
                  {text("先失败，再工位，再人员", "Failure first")}
                </h2>
              </div>
              <div className="space-y-3">
                {[
                  text("先确认失败记录是否集中在某个工位。", "Check whether failures are clustered by station."),
                  text("再看是否由少数操作员或少数规格触发。", "Then see whether operator or spec concentration exists."),
                  text("必要时再进入告警页做升级或派发。", "Escalate in the alert page only when needed."),
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
        title={text("筛选与复核队列", "Filter and review queue")}
        description={text(
          "这里参考了 Ant Design 的列表页与 Carbon 的数据表工具栏模式，把失败优先、工位聚焦和关键词搜索统一放到表格之前。",
          "Use filters and a failure-first queue before opening the full inspection table."
        )}
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(18rem,0.9fr)]">
          <WorkbenchFilterBar
            eyebrow={text("复核工具栏", "Review toolbar")}
            title={text("先锁定问题，再读全量记录", "Lock onto the problem before reading the full queue")}
            description={text(
              "用结果、工位和关键词先收敛范围，让复核从问题样本开始，而不是从第一行开始。",
              "Filter by result, station, and keyword so review starts from pressure points instead of row one."
            )}
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            searchPlaceholder={text(
              "搜索检测编号、轮毂编号、工位或操作员",
              "Search inspection ID, wheel ID, station, or operator",
            )}
            summary={text(
              `当前显示 ${filteredRecords.length} / ${records.length} 条检测记录`,
              `Showing ${filteredRecords.length} of ${records.length} inspections`,
            )}
            filters={[
              {
                id: "ALL",
                label: text("全部结果", "All results"),
                count: records.length,
                active: resultFilter === "ALL",
                onClick: () => setResultFilter("ALL"),
              },
              {
                id: "FAIL",
                label: text("失败优先", "Failures"),
                count: failCount,
                active: resultFilter === "FAIL",
                onClick: () => setResultFilter("FAIL"),
              },
              {
                id: "PASS",
                label: text("通过记录", "Passes"),
                count: records.length - failCount,
                active: resultFilter === "PASS",
                onClick: () => setResultFilter("PASS"),
              },
              ...stationSummary.map(([station, count]) => ({
                id: station,
                label: station,
                count,
                active: stationFilter === station,
                onClick: () => setStationFilter(station),
              })),
            ]}
            secondaryAction={
              <Button
                variant="outline"
                onClick={() => {
                  setSearchValue("");
                  setResultFilter("ALL");
                  setStationFilter("ALL");
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
                  {text("重点复核", "Priority review")}
                </p>
                <h3 className="mt-2 text-2xl font-black tracking-tight">
                  {text("失败记录置顶处理", "Failures stay on top")}
                </h3>
              </div>
              <div className="space-y-3">
                {reviewQueue.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-border/70 bg-background/55 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <strong>{item.id}</strong>
                      <Badge
                        variant={item.result === "PASS" ? "success" : "warning"}
                      >
                        {item.result}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {item.wheelId} · {item.station} · {item.operator}
                    </p>
                  </div>
                ))}
                {!reviewQueue.length ? (
                  <p className="text-sm text-muted-foreground">
                    {text("当前筛选结果没有检测记录。", "No inspections match the current filter.")}
                  </p>
                ) : null}
              </div>
            </div>
          </Card>
        </div>
      </TaskSection>

      <TaskSection
        title={text("检测压力解释", "Inspection pressure summary")}
        description={text(
          "先用工位和人员分布解释这批检测记录意味着什么，再进入明细，页面会更像复核台而不是日志页。",
          "Use station and operator summaries before reading the raw queue."
        )}
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <Card variant="glass" className="border-border/70">
            <div className="mb-3 flex items-center justify-between">
              <strong>{text("工位分布", "Station distribution")}</strong>
              <Badge variant="secondary">{stationSummary.length}</Badge>
            </div>
            <div className="space-y-3">
              {stationSummary.map(([station, count]) => (
                <div
                  key={station}
                  className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/55 px-4 py-3"
                >
                  <span className="font-medium">{station}</span>
                  <Badge variant="info">{count}</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card variant="glass" className="border-border/70">
            <div className="mb-3 flex items-center justify-between">
              <strong>{text("操作员分布", "Operator distribution")}</strong>
              <Badge variant="secondary">{operatorSummary.length}</Badge>
            </div>
            <div className="space-y-3">
              {operatorSummary.map(([operator, count]) => (
                <div
                  key={operator}
                  className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/55 px-4 py-3"
                >
                  <span className="font-medium">{operator}</span>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card variant="glass" className="border-border/70">
            <div className="space-y-4">
              <strong className="block text-lg">
                {text("升级判断", "Escalation decision")}
              </strong>
              <p className="text-sm leading-6 text-muted-foreground">
                {failCount > 0
                  ? text(
                      "当前已经出现失败记录，更适合把这页作为复核入口，并在确认问题后转去告警处置。",
                      "Failures are present, so this page should feed the alert workflow."
                    )
                  : text(
                      "目前以通过记录为主，更适合作为抽查和过程确认页面，而不是高压告警页。",
                      "The current queue is mainly a review surface rather than an alert-heavy one."
                    )}
              </p>
              <Button asChild className="w-full justify-between">
                <Link href="/admin/alerts">
                  {text("继续到告警页", "Continue to alerts")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-between">
                <Link href="/admin/wheels">
                  {text("返回规格台账", "Back to wheel specs")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      </TaskSection>

      <TaskSection
        title={t("pages.admin.inspections.copy008", undefined, "检测记录明细")}
        description={text(
          "只有在你已经知道要找什么之后，逐条记录才真正有价值，因此表格被放在解释层之后。",
          "The table comes after the summary layer so it supports review instead of replacing it."
        )}
        action={<ExportButton onClick={handleExport} disabled={!records.length} />}
      >
        {!records.length ? (
          <EmptyStateCard
            icon={<ShieldAlert className="h-6 w-6" />}
            title={text("还没有检测记录", "No inspection records yet")}
            description={text(
              "检测数据进入后台后，这里会成为失败复核、工位定位和人员追踪的基础页面。",
              "Inspection data will appear here for review and escalation."
            )}
          />
        ) : !filteredRecords.length ? (
          <EmptyStateCard
            icon={<ShieldAlert className="h-6 w-6" />}
            title={text("当前筛选没有匹配记录", "No matching inspection records")}
            description={text(
              "调整失败筛选、工位或搜索关键词后，再继续复核检测队列。",
              "Adjust result filters, station, or search term to continue reviewing inspections.",
            )}
          />
        ) : (
          <Card variant="glass" className="border-border/70 p-0">
            <Table>
              <TableCaption>
                {text(
                  `已根据当前筛选显示 ${filteredRecords.length} 条检测记录。`,
                  `${filteredRecords.length} filtered inspection records are visible.`,
                )}
              </TableCaption>
              <TableHeader className="bg-card/70">
                <TableRow className="border-border/70">
                  <TableHead>{t("pages.admin.inspections.copy001")}</TableHead>
                  <TableHead>{t("pages.admin.inspections.copy009")}</TableHead>
                  <TableHead>{t("pages.admin.inspections.copy003")}</TableHead>
                  <TableHead>{t("pages.admin.alerts.copy014")}</TableHead>
                  <TableHead>{t("pages.admin.inspections.copy004")}</TableHead>
                  <TableHead>{t("pages.admin.inspections.copy005")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((item) => (
                  <TableRow key={item.id} className="border-border/50">
                    <TableCell className="font-mono text-xs text-foreground">
                      {item.id}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-foreground">
                      {item.wheelId}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={item.result === "PASS" ? "success" : "destructive"}
                      >
                        {item.result}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.station}</TableCell>
                    <TableCell>{item.operator}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.finishedAt}
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
