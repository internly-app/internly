import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
  loadingStages,
  loadingStageIndex,
}: Props) {
  return (
    <Card
      className={cn(
        "w-full max-w-md mx-auto",
        !prefersReducedMotion && "transition-opacity duration-200 ease-out",
        loadingAnimState === "enter" ? "opacity-100" : "opacity-0"
      )}
    >
      <CardContent className="pt-6 pb-6">
        <div className="space-y-5">
          {loadingStages.map((stage, index) => {
            const isCompleted = index < loadingStageIndex;
            const isCurrent = index === loadingStageIndex;

            return (
              <div key={stage} className="flex items-center gap-3">
                <div className="flex-shrink-0 flex items-center justify-center w-6 h-6">
                  {isCompleted ? (
                    <CheckCircle2 className="size-5 text-green-500" />
                  ) : isCurrent ? (
                    <Loader2 className="size-5 animate-spin text-primary" />
                  ) : (
                    <Circle className="size-4 text-muted-foreground/30" />
                  )}
                </div>
                <div
                  className={cn(
                    "text-sm font-medium transition-colors duration-200",
                    isCompleted
                      ? "text-muted-foreground"
                      : isCurrent
                      ? "text-foreground"
                      : "text-muted-foreground/50"
                  )}
                >
                  {stage}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
