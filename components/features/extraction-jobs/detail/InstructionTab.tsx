import { Separator } from "@/components/shadcn_ui/separator";
import { TabsContent } from "@/components/shadcn_ui/tabs";
import { schemaToSimplePreview } from "@/components/features/instructions/schema-builder/SchemaBuilder";
import type { InstructionDetails } from "@/components/features/extraction-jobs/types";

export function InstructionTab({ instruction }: { instruction: InstructionDetails }) {
  return (
    <TabsContent value="instruction" className="mt-3 space-y-3">
      <div className="space-y-1">
        <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
          Title
        </p>
        <p className="font-mono text-sm text-foreground">{instruction.title}</p>
      </div>
      <Separator />
      <div className="space-y-1.5">
        <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
          PROMPT TEMPLATE
        </p>
        <pre className="h-150 overflow-auto font-mono text-xs text-foreground whitespace-pre-wrap leading-relaxed bg-muted/40 border border-border rounded-lg p-3">
          {instruction.prompt}
        </pre>
      </div>
      {instruction.outputSchema && (
        <>
          <Separator />
          <div className="flex-1 rounded-md border border-border overflow-hidden flex flex-col">
            <div className="bg-muted/60 border-b border-border px-3 py-2 flex items-center gap-2 shrink-0">
              <span className="size-2.5 rounded-full bg-red-400/70" />
              <span className="size-2.5 rounded-full bg-yellow-400/70" />
              <span className="size-2.5 rounded-full bg-green-400/70" />
              <span className="ml-2 font-mono text-[10px] text-muted-foreground/50 uppercase tracking-wider">
                Output Schema
              </span>
            </div>
            <pre className="bg-preview-window flex-1 font-mono text-[11px] p-3 text-muted-foreground overflow-auto whitespace-pre leading-relaxed">
              {JSON.stringify(schemaToSimplePreview(instruction.outputSchema), null, 2)}
            </pre>
          </div>
        </>
      )}
    </TabsContent>
  );
}
