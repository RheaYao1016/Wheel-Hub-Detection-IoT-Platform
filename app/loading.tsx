/**
 * Global loading page (app/loading.tsx)
 * Uses the unified Loading component for consistent UX.
 */
import { Loading as LoadingComponent } from "./components/ui/Loading";

export default function Loading() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center py-20">
      <LoadingComponent
        variant="spinner"
        size="lg"
        label="正在加载"
        description="工业表面缺陷智能检测系统正在准备中..."
      />
    </div>
  );
}
