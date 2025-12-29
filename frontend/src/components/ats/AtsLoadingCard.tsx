import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

type Props = {
  prefersReducedMotion: boolean;
  loadingAnimState: "idle" | "enter" | "exit";
  loadingMessage: string;
  loadingStages: string[];
  loadingStageIndex: number;
  loadingProgress: number;
};

export default function AtsLoadingCard({
  prefersReducedMotion,
  loadingAnimState,
  loadingMessage,
  loadingStages,
  loadingStageIndex,
  loadingProgress,
}: Props) {
  return (
    <Card
      className={
        prefersReducedMotion
          ? undefined
          : `transition-opacity duration-200 ease-out ${
              loadingAnimState === "enter"
                ? "opacity-100"
                : loadingAnimState === "exit"
                ? "opacity-0"
                : "opacity-0"
            }`
      }
    >
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Loader2 className="size-5 animate-spin text-primary" />
            <div className="flex flex-col">
              <span className="text-sm">
                {loadingMessage || loadingStages[loadingStageIndex]}…
              </span>
              <span className="text-xs text-muted-foreground">
                This usually takes under a minute.
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary/80 transition-[width] duration-300 ease-out"
                style={{
                  width: `${Math.max(2, Math.min(100, loadingProgress))}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>Working…</span>
              <span>{Math.round(loadingProgress)}%</span>
            </div>
          </div>

          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
