import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

type Props = {
  message: string;
};

export default function AtsErrorCard({ message }: Props) {
  return (
    <Card className="border-red-500/50 bg-red-500/5">
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="size-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-500">Analysis Failed</p>
            <p className="text-sm text-muted-foreground mt-1">{message}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
