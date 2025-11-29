import React, { useRef, useEffect } from 'react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';

interface CalendarStripProps {
    selectedDate: Date;
    onSelectDate: (date: Date) => void;
}

export function CalendarStrip({ selectedDate, onSelectDate }: CalendarStripProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const days = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i)); // Show 14 days starting today

    useEffect(() => {
        if (scrollRef.current) {
            // Scroll to selected date if possible, logic can be improved
        }
    }, []);

    return (
        <div className="w-full overflow-x-auto no-scrollbar py-4 bg-background/50 backdrop-blur-sm" ref={scrollRef}>
            <div className="flex space-x-4 px-4 min-w-max">
                {days.map((date) => {
                    const isSelected = isSameDay(date, selectedDate);
                    return (
                        <button
                            key={date.toISOString()}
                            onClick={() => onSelectDate(date)}
                            className={cn(
                                "flex flex-col items-center justify-center min-w-[60px] h-[80px] rounded-2xl transition-all duration-300 border",
                                isSelected
                                    ? "bg-primary text-primary-foreground shadow-lg scale-105 border-primary"
                                    : "bg-card text-muted-foreground hover:bg-secondary border-border"
                            )}
                        >
                            <span className="text-xs font-medium mb-1">{format(date, 'EEE')}</span>
                            <span className={cn("text-xl font-bold", isSelected ? "text-primary-foreground" : "text-foreground")}>
                                {format(date, 'd')}
                            </span>
                            {isSelected && (
                                <div className="w-1.5 h-1.5 bg-primary-foreground rounded-full mt-1" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
