import React from 'react';
import { Todo } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Clock, Moon, Sun, Briefcase, Check, Play, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

interface TimelineItemProps {
    todo: Todo;
    isLast?: boolean;
    onToggle: (id: string) => void;
    onDelete: (id: string) => void;
}

// Extract YouTube video ID from various URL formats
function extractYouTubeId(text: string): string | null {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/,
        /youtube\.com\/shorts\/([^&\s]+)/
    ];
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) return match[1];
    }
    return null;
}

export function TimelineItem({ todo, isLast, onToggle, onDelete }: TimelineItemProps) {
    const youtubeId = extractYouTubeId(todo.text);

    const getIcon = () => {
        if (youtubeId) return <Play className="w-5 h-5 text-white" />;
        switch (todo.category) {
            case 'morning': return <Sun className="w-5 h-5 text-white" />;
            case 'night': return <Moon className="w-5 h-5 text-white" />;
            case 'work': return <Briefcase className="w-5 h-5 text-white" />;
            default: return <Clock className="w-5 h-5 text-white" />;
        }
    };

    const getColor = () => {
        if (todo.completed) return 'bg-green-500';
        if (youtubeId) return 'bg-red-500';
        switch (todo.category) {
            case 'morning': return 'bg-orange-400';
            case 'night': return 'bg-indigo-500';
            case 'work': return 'bg-blue-500';
            default: return 'bg-primary';
        }
    };

    const openYouTube = () => {
        if (youtubeId) {
            window.open(`https://www.youtube.com/watch?v=${youtubeId}`, '_blank');
        }
    };

    // Clean text by removing YouTube URL for display
    const displayText = youtubeId
        ? todo.text.replace(/https?:\/\/(www\.)?(youtube\.com|youtu\.be)\S*/g, '').trim() || 'Watch Video'
        : todo.text;

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
                    <div className="flex-1">
                        <h3 className={cn(
                            "text-lg font-semibold text-foreground transition-all",
                            todo.completed && "line-through text-muted-foreground"
                        )}>
                            {displayText}
                        </h3>

                        {/* YouTube Preview */}
                        {youtubeId && (
                            <button
                                onClick={openYouTube}
                                className="mt-2 relative rounded-xl overflow-hidden group cursor-pointer w-full max-w-[200px]"
                            >
                                <img
                                    src={`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`}
                                    alt="YouTube video"
                                    className="w-full aspect-video object-cover rounded-xl border border-border"
                                />
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/40 transition-colors">
                                    <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center shadow-lg">
                                        <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                                    </div>
                                </div>
                                <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-0.5 rounded text-[10px] text-white flex items-center gap-1">
                                    <ExternalLink className="w-3 h-3" />
                                    Open
                                </div>
                            </button>
                        )}

                        {todo.hasAlarm && (
                            <div className="flex items-center mt-1 text-xs text-primary">
                                <Clock className="w-3 h-3 mr-1" />
                                <span>Alarm set</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onDelete(todo.id)}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                            <span className="sr-only">Delete</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                        </button>
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
            </div>
        </motion.div>
    );
}
