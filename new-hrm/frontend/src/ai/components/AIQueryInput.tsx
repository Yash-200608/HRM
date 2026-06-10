import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";
import { FormEvent, useState } from "react";

interface AIQueryInputProps {
  onSubmit: (query: string) => Promise<void>;
  isSubmitting?: boolean;
  placeholder?: string;
}

export default function AIQueryInput({
  onSubmit,
  isSubmitting = false,
  placeholder = "Ask a question about your workforce...",
}: AIQueryInputProps) {
  const [query, setQuery] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || isSubmitting) {
      return;
    }

    await onSubmit(trimmed);
    setQuery("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Textarea
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
        rows={3}
        maxLength={2000}
        disabled={isSubmitting}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{query.length}/2000</span>
        <Button type="submit" disabled={isSubmitting || !query.trim()}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Ask AI
            </>
          )}
        </Button>
      </div>
    </form>
  );
}