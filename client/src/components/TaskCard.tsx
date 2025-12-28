import React from "react";
import { cn } from "@/lib/utils";
import { Clock, Calendar, Hash, FileText, CheckCircle2, Paperclip, Download, Trash2, PartyPopper } from "lucide-react";


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
  onDelete?: (id: string) => void;
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
  onComplete,
  onDelete
}: TaskProps) {
  const daysRemaining = Math.ceil((deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl sm:rounded-2xl border border-border p-5 sm:p-6 lg:p-8 transition-colors hover:border-primary/20 h-full flex flex-col shadow-xl",
        completed
          ? "bg-green-500/10 border-green-500/20"
          : "bg-card hover:bg-secondary"
      )}
      data-testid={`task-card-${id}`}
    >
      {/* Header Tags */}
      <div className="mb-3 sm:mb-4 flex items-center justify-between gap-2">
        <span className={cn(
          "inline-flex items-center rounded-md px-2.5 sm:px-3 py-1 text-xs font-bold uppercase tracking-wider",
          type === "assignment"
            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
            : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
        )}>
          {type}
        </span>

        <div className="flex items-center gap-2">
          {!completed && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(id);
              }}
              className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              title="Delete Task"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}

          {completed ? (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2.5 sm:px-3 py-1 text-xs font-bold uppercase text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Completed</span>
            </span>
          ) : (
            <button
              onClick={() => onComplete?.(id)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 sm:px-3 py-1 text-xs font-bold uppercase text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
              data-testid={`task-complete-${id}`}
            >
              <span className="hidden sm:inline">Mark Done</span>
              <span className="sm:hidden">Done</span>
            </button>
          )}
        </div>
      </div>

      {/* Title */}
      <div className="flex items-start justify-between gap-4 mb-4 sm:mb-5">
        <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold leading-tight tracking-tight text-foreground line-clamp-2">
          {title}
        </h3>
        {completed && (
          <div className="rounded-full bg-green-500/20 p-2 text-green-600 dark:text-green-400 flex-shrink-0 animate-in zoom-in duration-300">
            <PartyPopper className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
        )}
      </div>

      {/* Attachment (if exists) */}
      {attachment && (
        <div className="mb-4 sm:mb-5">
          <a
            href={attachment.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 sm:gap-4 rounded-xl border border-border/50 bg-secondary/30 p-3 sm:p-4 transition-colors hover:bg-secondary/50 hover:border-primary/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-red-500/10 text-red-500 flex-shrink-0">
              <Paperclip className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="flex-1 overflow-hidden min-w-0">
              <p className="truncate text-sm font-medium">{attachment.name}</p>
              <p className="text-xs text-muted-foreground">PDF Document</p>
            </div>
            <Download className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
          </a>
        </div>
      )}

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-y-3 sm:gap-y-4 text-sm text-muted-foreground mt-auto">

        {/* Left Column: Time info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 opacity-50 flex-shrink-0" />
            <span className="font-mono truncate">{deadline.toLocaleDateString()}</span>
          </div>
          <div className={cn(
            "flex items-center gap-2 font-medium",
            !completed && daysRemaining <= 2
              ? "text-red-500 dark:text-red-400"
              : !completed
                ? "text-green-600 dark:text-green-400"
                : "text-muted-foreground"
          )}>
            <Clock className="h-4 w-4 opacity-50 flex-shrink-0" />
            <span className="truncate">{completed ? "Ended" : `${daysRemaining} days left`}</span>
          </div>
        </div>

        {/* Right Column: Course info */}
        <div className="flex flex-col items-end space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-mono opacity-70 truncate">{courseCode}</span>
            <Hash className="h-4 w-4 opacity-30 flex-shrink-0" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono opacity-70 truncate">{sectionId}</span>
            <FileText className="h-4 w-4 opacity-30 flex-shrink-0" />
          </div>
        </div>
      </div>
      {/* Progress Bar (Optional, for visual flair) */}
      <div className="absolute bottom-0 left-0 h-1 bg-primary/10 w-full">
        <div
          className="h-full bg-primary/50 transition-all duration-1000 ease-out"
          style={{ width: `${Math.max(0, Math.min(100, 100 - (daysRemaining * 10)))}%` }}
        />
      </div>
    </div>
  );
}
