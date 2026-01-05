import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

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
        "w-full overflow-hidden shadow-xl",
        !prefersReducedMotion && "transition-all duration-500 ease-out",
        loadingAnimState === "enter"
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-4"
      )}
    >
      <CardContent className="pt-8 pb-8 px-8">
        <div className="flex flex-col">
          {loadingStages.map((stage, index) => {
            const isCompleted = index < loadingStageIndex;
            const isCurrent = index === loadingStageIndex;
            const isPending = index > loadingStageIndex;
            const isLast = index === loadingStages.length - 1;

            return (
              <div key={stage} className="flex gap-4">
                {/* Icon Column */}
                <div className="flex flex-col items-center">
                  <div className="relative flex items-center justify-center w-6 h-6 z-10 bg-background rounded-full ring-4 ring-background">
                    {isCompleted ? (
                      <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 20,
                        }}
                      >
                        <CheckCircle2 className="size-6 text-green-500 fill-green-500/10" />
                      </motion.div>
                    ) : isCurrent ? (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="relative flex items-center justify-center w-full h-full"
                      >
                        <motion.div
                          className="absolute inset-0 bg-primary/20 dark:bg-white/20 rounded-full -z-10"
                          animate={{
                            scale: [1, 2],
                            opacity: [0, 0.5, 0],
                          }}
                          transition={{
                            duration: 2.5,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        />
                        <Loader2 className="size-4 animate-spin text-primary relative z-10" />
                      </motion.div>
                    ) : (
                      <Circle className="size-4 text-muted-foreground/20" />
                    )}
                  </div>

                  {/* Connecting Line */}
                  {!isLast && (
                    <div className="w-[2px] h-8 my-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div
                        className="w-full bg-green-500 origin-top"
                        initial={{ height: "0%" }}
                        animate={{ height: isCompleted ? "100%" : "0%" }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                      />
                    </div>
                  )}
                </div>

                {/* Text Column */}
                <div className={cn("flex-1 pt-0.5", !isLast && "pb-6")}>
                  <div className="flex items-center justify-between">
                    <motion.span
                      className={cn(
                        "text-sm font-medium transition-colors duration-300",
                        isCompleted
                          ? "text-green-600 dark:text-green-400"
                          : isCurrent
                          ? "text-foreground"
                          : "text-muted-foreground/40"
                      )}
                      animate={{
                        x: isCurrent ? 4 : 0,
                        opacity: isPending ? 0.5 : 1,
                      }}
                    >
                      {stage}
                    </motion.span>

                    {isCurrent && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-1.5"
                      >
                        <span className="text-[10px] font-medium text-primary uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded-full">
                          Processing
                        </span>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
