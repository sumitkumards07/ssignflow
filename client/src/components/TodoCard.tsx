import React from "react";

import { Trash2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Todo } from "@/lib/types";

interface TodoCardProps extends Todo {
    onToggle: (id: string) => void;
    onDelete: (id: string) => void;
}

export function TodoCard({ id, text, completed, onToggle, onDelete }: TodoCardProps) {
    return (
        <div
            className={cn(
                "group flex items-center gap-3 rounded-xl border border-border p-4 transition-colors shadow-sm",
                completed
                    ? "bg-green-500/10 border-green-500/20"
                    : "bg-card hover:bg-secondary"
            )}
        >
            <button
                onClick={() => onToggle(id)}
                className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors",
                    completed
                        ? "bg-green-500 border-green-500 text-white"
                        : "border-muted-foreground/30 hover:border-primary"
                )}
            >
                {completed && <Check className="h-3.5 w-3.5" />}
            </button>

            <span
                className={cn(
                    "flex-1 text-sm font-medium transition-all",
                    completed ? "text-muted-foreground line-through decoration-green-500/50" : "text-foreground"
                )}
            >
                {text}
            </span>

            <button
                onClick={() => onDelete(id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-muted-foreground hover:text-destructive"
            >
                <Trash2 className="h-4 w-4" />
            </button>
        </div>
    );
}
