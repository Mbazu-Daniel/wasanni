import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconPlus, IconTrash } from "@tabler/icons-react";

const MAX_HINTS = 20;
const MAX_HINT_LENGTH = 200;

type HintsEditorProps = {
  value: string[];
  onChange: (hints: string[]) => void;
};

export const HintsEditor = ({ value, onChange }: HintsEditorProps) => (
  <div className="space-y-2">
    {value.map((hint, index) => (
      <div key={index} className="flex items-center gap-2">
        <Input
          value={hint}
          maxLength={MAX_HINT_LENGTH}
          placeholder={`Hint ${index + 1}`}
          onChange={(event) =>
            onChange(
              value.map((row, at) => (at === index ? event.target.value : row)),
            )
          }
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Remove hint ${index + 1}`}
          onClick={() => onChange(value.filter((_, at) => at !== index))}
        >
          <IconTrash className="size-4" />
        </Button>
      </div>
    ))}
    {value.length < MAX_HINTS && (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...value, ""])}
      >
        <IconPlus className="size-4" />
        Add hint
      </Button>
    )}
  </div>
);
