import { registerPlugin } from '@capacitor/core';

export interface WidgetDataPlugin {
    updateTodoData(options: { json: string }): Promise<void>;
    updatePomodoroData(options: { json: string }): Promise<void>;
}

const WidgetData = registerPlugin<WidgetDataPlugin>('WidgetData');

export const updateTodoWidget = async (todos: any[]) => {
    try {
        console.log('Updating Todo Widget with', todos.length, 'items');
        // Filter only necessary data to keep JSON small
        const widgetData = todos.map(t => ({
            text: t.text,
            completed: t.completed
        }));
        await WidgetData.updateTodoData({ json: JSON.stringify(widgetData) });
    } catch (error) {
        console.error('Failed to update todo widget:', error);
    }
};

export const updatePomodoroWidget = async (time: string, isRunning: boolean, progress: number, targetTime: number = 0) => {
    try {
        console.log('Updating Pomodoro Widget:', { time, isRunning, targetTime });
        const widgetData = {
            time,
            isRunning,
            progress,
            targetTime
        };
        await WidgetData.updatePomodoroData({ json: JSON.stringify(widgetData) });
    } catch (error) {
        console.error('Failed to update pomodoro widget:', error);
    }
};
