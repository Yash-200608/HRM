import { Button } from "@/components/ui/button";
import { AiSuggestion } from "@/ai/services/aiService";
import { Sparkles } from "lucide-react";

interface AISuggestionChipsProps {
  suggestions: AiSuggestion[];
  onSelect: (query: string) => void;
  disabled?: boolean;
}

export default function AISuggestionChips({
  suggestions,
  onSelect,
  disabled = false,
}: AISuggestionChipsProps) {
  if (!suggestions.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {suggestions.map((suggestion) => (
        <Button
          key={suggestion.id}
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => onSelect(suggestion.query)}
          className="h-auto whitespace-normal text-left"
        >
          <Sparkles className="mr-2 h-3.5 w-3.5 shrink-0" />
          {suggestion.label}
        </Button>
      ))}
    </div>
  );
}