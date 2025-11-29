import React from 'react';
import { Todo } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Clock, Moon, Sun, Briefcase, Check } from 'lucide-react';
import { motion } from 'framer-motion';

interface TimelineItemProps {
    todo: Todo;
    isLast: boolean;
    onToggle: (id: string) => void;
}

export function TimelineItem({ todo, isLast, onToggle }: TimelineItemProps) {
    const getIcon = () => {
        switch (todo.category) {
            case 'morning': return <Sun className="w-5 h-5 text-white" />;
            case 'night': return <Moon className="w-5 h-5 text-white" />;
            case 'work': return <Briefcase className="w-5 h-5 text-white" />;
            default: return <Clock className="w-5 h-5 text-white" />;
        }
    };

    const getColor = () => {
        if (todo.completed) return 'bg-green-500';
        switch (todo.category) {
            case 'morning': return 'bg-orange-400';
            case 'night': return 'bg-indigo-500';
            case 'work': return 'bg-blue-500';
            default: return 'bg-primary';
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex w-full relative pl-4"
        >
            {/* Timeline Line */}
            {!isLast && (
                <div className="absolute left-[2.25rem] top-12 bottom-[-2rem] w-0.5 bg-border -z-10" />
            )}

            {/* Time Column */}
            <div className="w-20 pt-3 text-right pr-4">
                <span className="text-xs text-muted-foreground font-medium">{todo.time || 'All Day'}</span>
            </div>

            {/* Icon Node */}
            <div className={cn(
                "relative z-10 w-12 h-12 rounded-full flex items-center justify-center shadow-lg border-4 border-background",
                getColor()
            )}>
                {getIcon()}
            </div>

            {/* Content */}
            <div className="flex-1 ml-4 pt-1 pb-8">
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className={cn(
                            "text-lg font-semibold text-foreground transition-all",
                            todo.completed && "line-through text-muted-foreground"
                        )}>
                            {todo.text}
                        </h3>
                        {todo.hasAlarm && (
                            <div className="flex items-center mt-1 text-xs text-primary">
                                <Clock className="w-3 h-3 mr-1" />
                                <span>Alarm set</span>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => onToggle(todo.id)}
                        className={cn(
                            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                            todo.completed
                                ? "bg-green-500 border-green-500"
                                : "border-muted-foreground hover:border-primary"
                        )}
                    >
                        {todo.completed && <Check className="w-3 h-3 text-white" />}
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
