import React from "react";
import { cn } from "@/lib/utils";
import { Clock, Calendar, Hash, FileText, CheckCircle2, Paperclip, Download } from "lucide-react";

export type TaskType = "assignment" | "quiz";

export interface TaskProps {
  id: string;
  type: TaskType;
  title: string;
  courseCode: string;
  sectionId: string;
  deadline: Date;
  completed?: boolean;
  attachment?: {
    name: string;
    url: string;
  };
  onComplete?: (id: string) => void;
}

export function TaskCard({ 
  id,
  type, 
  title, 
  courseCode, 
  sectionId, 
  deadline, 
  completed,
  attachment,
  onComplete 
}: TaskProps) {
  const daysRemaining = Math.ceil((deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  
  return (
    <div 
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/20 active:scale-[0.98]",
        completed && "opacity-75 grayscale-[0.5]"
      )}
      data-testid={`task-card-${id}`}
    >
      {/* Header Tags */}
      <div className="mb-3 flex items-center justify-between">
        <span className={cn(
          "inline-flex items-center rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
          type === "assignment" 
            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" 
            : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
        )}>
          {type}
        </span>
        
        {completed ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-[10px] font-bold uppercase text-muted-foreground">
            <CheckCircle2 className="h-3 w-3" />
            Completed
          </span>
        ) : (
          <button 
            onClick={() => onComplete?.(id)}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] font-bold uppercase text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
            data-testid={`task-complete-${id}`}
          >
            Mark Done
          </button>
        )}
      </div>

      {/* Title */}
      <h3 className="mb-4 text-xl font-bold leading-tight tracking-tight text-foreground">
        {title}
      </h3>

      {/* Attachment (if exists) */}
      {attachment && (
        <div className="mb-4">
          <a 
            href={attachment.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg border border-border/50 bg-secondary/30 p-3 transition-colors hover:bg-secondary/50 hover:border-primary/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded bg-red-500/10 text-red-500">
              <Paperclip className="h-4 w-4" />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-xs font-medium">{attachment.name}</p>
              <p className="text-[10px] text-muted-foreground">PDF Document</p>
            </div>
            <Download className="h-4 w-4 text-muted-foreground" />
          </a>
        </div>
      )}

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-y-3 text-xs text-muted-foreground">
        
        {/* Left Column: Time info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 opacity-50" />
            <span className="font-mono">{deadline.toLocaleDateString()}</span>
          </div>
          <div className={cn(
            "flex items-center gap-2 font-medium",
            !completed && daysRemaining <= 2 ? "text-red-500 dark:text-red-400" : "text-muted-foreground"
          )}>
            <Clock className="h-3.5 w-3.5 opacity-50" />
            <span>{completed ? "Ended" : `${daysRemaining} days left`}</span>
          </div>
        </div>

        {/* Right Column: Course info */}
        <div className="flex flex-col items-end space-y-2">
          <div className="flex items-center gap-1.5">
            <span className="font-mono opacity-70">{courseCode}</span>
            <Hash className="h-3.5 w-3.5 opacity-30" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono opacity-70">{sectionId}</span>
            <FileText className="h-3.5 w-3.5 opacity-30" />
          </div>
        </div>
      </div>
    </div>
  );
}
