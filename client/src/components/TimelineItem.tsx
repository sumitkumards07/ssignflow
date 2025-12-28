import React from 'react';
import { Todo } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Clock, Moon, Sun, Briefcase, Check, Play, Trash2 } from 'lucide-react';

interface TimelineItemProps {
    todo: Todo;
    isLast?: boolean;
    onToggle: (id: string) => void;
    onDelete: (id: string) => void;
}

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

import { motion, AnimatePresence } from 'framer-motion';

export const TimelineItem = React.memo(function TimelineItem({ todo, isLast, onToggle, onDelete }: TimelineItemProps) {
    const youtubeId = extractYouTubeId(todo.text);

    const getIcon = () => {
        const iconClass = "w-3 h-3 text-white";
        if (youtubeId) return <Play className={iconClass} />;
        switch (todo.category) {
            case 'morning': return <Sun className={iconClass} />;
            case 'night': return <Moon className={iconClass} />;
            case 'work': return <Briefcase className={iconClass} />;
            default: return <Clock className={iconClass} />;
        }
    };

    const openYouTube = () => {
        if (youtubeId) {
            window.open(`https://www.youtube.com/watch?v=${youtubeId}`, '_blank');
        }
    };

    const displayText = youtubeId
        ? todo.text.replace(/https?:\/\/(www\.)?(youtube\.com|youtu\.be)\S*/g, '').trim() || 'Watch Video'
        : todo.text;

    return (
        <div className="relative mb-4 group overflow-hidden rounded-2xl">
            {/* Delete Background (Visible during swipe) */}
            <div className="absolute inset-0 bg-red-500 flex items-center justify-end px-6 rounded-2xl translate-x-1">
                <Trash2 className="w-6 h-6 text-white" />
            </div>

            <motion.div
                drag="x"
                dragConstraints={{ left: -100, right: 0 }}
                dragElastic={0.1}
                onDragEnd={(_, info) => {
                    if (info.offset.x < -60) {
                        onDelete(todo.id);
                    }
                }}
                className="relative flex w-full pl-4 bg-background/50 backdrop-blur-md select-none touch-pan-y"
            >
                {/* Timeline Line */}
                <div className="absolute left-6 top-0 bottom-0 w-px bg-border/40 group-last:bottom-1/2" />

                {/* Timeline Node */}
                <div className={cn(
                    "absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-background z-10 transition-colors duration-300",
                    todo.completed ? "bg-zinc-600 dark:bg-zinc-700 scale-75" : "bg-orange-500 shadow-[0_0_15px_rgba(255,138,0,0.6)]"
                )} />

                {/* Time / Status Label */}
                <div className="w-14 pt-1 flex flex-col items-center justify-center mr-2">
                    <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-tighter">
                        {todo.time || "Noon"}
                    </span>
                    {todo.completed && (
                        <div className="mt-1 bg-green-500/20 text-green-500 p-0.5 rounded-full">
                            <Check className="w-2.5 h-2.5" />
                        </div>
                    )}
                </div>

                {/* Card Content */}
                <div className="flex-1 relative pb-2 pt-1 pr-4">
                    <div className={cn(
                        "relative p-4 rounded-2xl transition-all duration-300 tactical-card",
                        todo.completed
                            ? "opacity-40 grayscale scale-[0.98]"
                            : "tactical-border-orange border-white/10"
                    )}>
                        <div className="flex items-start gap-4">
                            <button
                                onClick={() => onToggle(todo.id)}
                                className={cn(
                                    "mt-1 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0",
                                    todo.completed
                                        ? "bg-green-500 border-green-500"
                                        : "bg-transparent border-orange-500/50 dark:border-orange-500/30 hover:border-orange-500 hover:shadow-[0_0_10px_rgba(255,138,0,0.3)]"
                                )}
                            >
                                {todo.completed && <Check className="w-4 h-4 text-white" />}
                            </button>

                            <div className="flex-1 min-w-0">
                                <h3 className={cn(
                                    "text-base font-black leading-tight truncate tracking-tight",
                                    todo.completed ? "text-muted-foreground/60 line-through" : "text-white"
                                )}>
                                    {displayText}
                                </h3>
                            </div>

                            <div className="flex items-center gap-2 mt-2">
                                <div className={cn("flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-white/5 bg-white/5", {
                                    'text-blue-400': todo.category === 'work',
                                    'text-purple-400': todo.category === 'night',
                                    'text-orange-400': todo.category === 'morning',
                                    'text-zinc-500': !['work', 'night', 'morning'].includes(todo.category || '')
                                })}>
                                    {getIcon()}
                                    <span className="ml-1 tracking-[0.2em]">{todo.category || 'Op'}</span>
                                </div>

                                {todo.hasAlarm && (
                                    <div className="flex items-center text-[10px] text-zinc-500">
                                        <Clock className="w-3 h-3 mr-0.5" />
                                        <span>Alarm</span>
                                    </div>
                                )}
                            </div>

                            {youtubeId && !todo.completed && (
                                <div className="mt-3">
                                    <button
                                        onClick={openYouTube}
                                        className="relative w-full aspect-video rounded-lg overflow-hidden group shadow-lg"
                                    >
                                        <img
                                            src={`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`}
                                            alt="YouTube video"
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                                                <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                                            </div>
                                        </div>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
});
