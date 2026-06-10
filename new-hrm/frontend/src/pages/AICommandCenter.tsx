import AIChatPanel from "@/ai/components/AIChatPanel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { Helmet } from "react-helmet-async";

export default function AICommandCenter() {
  return (
    <>
      <Helmet>
        <title>AI Command Center | HRM</title>
      </Helmet>

      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight">AI Command Center</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Ask questions in plain English about attendance, leave, payroll, team
            performance, and workforce risks. The assistant summarizes results in
            simple tables and highlights. Any action it suggests must be reviewed
            and approved by you first.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>HR Intelligence</CardTitle>
            <CardDescription>
              AI-generated summaries. Verify before acting on this information.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AIChatPanel />
          </CardContent>
        </Card>
      </div>
    </>
  );
}