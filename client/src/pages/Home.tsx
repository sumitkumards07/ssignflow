import React, { useState, useEffect } from "react";

import { TaskCard, TaskProps } from "@/components/TaskCard";
import { AddTaskDrawer } from "@/components/AddTaskDrawer";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Task } from "@shared/schema";

import { getTasksFromStorage } from "@/lib/utils";
import confetti from "canvas-confetti";
import { playSuccessSound, playDeleteSound } from "@/lib/sounds";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BottomNav } from "@/components/layout/BottomNav";

export default function Home() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [location] = useLocation();
  const [tasks, setTasks] = useState<Task[]>([]);

  // Confirmation State
  const [taskToComplete, setTaskToComplete] = useState<string | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  // Load tasks on mount and when drawer closes (task added)
  useEffect(() => {
    setTasks(getTasksFromStorage());
  }, []);

  const handleAddTask = (newTask: any) => {
    // Task is already saved in AddTaskDrawer
    // Just refresh the list
    setTasks(getTasksFromStorage());
    setIsDrawerOpen(false);
  };

  const confirmCompleteTask = () => {
    if (!taskToComplete) return;

    // Play sound and show confetti
    playSuccessSound();
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    // Update local storage
    const updatedTasks = tasks.map(t =>
      t.id === taskToComplete ? { ...t, completed: true } : t
    );
    localStorage.setItem("my_tasks", JSON.stringify(updatedTasks));
    setTasks(updatedTasks);
    setTaskToComplete(null);
  };

  const confirmDeleteTask = () => {
    if (!taskToDelete) return;

    playDeleteSound();

    // Update local storage
    const updatedTasks = tasks.filter(t => t.id !== taskToDelete);
    localStorage.setItem("my_tasks", JSON.stringify(updatedTasks));
    setTasks(updatedTasks);
    setTaskToDelete(null);
  };

  // Filter tasks based on active tab
  const filteredTasks = tasks.filter(task => {
    if (location === "/completed") {
      return task.completed;
    }
    // Default to Home (All Upcoming)
    return !task.completed;
  }).sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

  // Limit completed tasks to last 6
  const displayedTasks = location === "/completed" ? filteredTasks.slice(-6) : filteredTasks;

  let pageTitle = "Upcoming Tasks";
  if (location === "/completed") pageTitle = "History";

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-background pb-32 text-foreground font-sans selection:bg-primary/20 overflow-hidden">
      {/* Header Section */}
      <header className="sticky top-0 z-10 bg-background/30 backdrop-blur-xl border-b border-white/10 pt-safe">
        <div className="flex items-center justify-center py-5">
          <div className="rounded-full bg-secondary/80 backdrop-blur-md px-8 py-2.5 shadow-sm border border-white/20">
            <h1 className="text-base font-bold tracking-wide uppercase">{pageTitle}</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-md px-5 pt-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={location} // Re-animate on tab change
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-5"
          >
            {displayedTasks.length === 0 ? (
              <motion.div
                variants={item}
                className="flex flex-col items-center justify-center py-16 text-center opacity-50"
              >
                <div className="mb-6 rounded-full bg-secondary/50 p-8">
                  <span className="text-5xl">🎉</span>
                </div>
                <p className="text-xl font-medium">No tasks found</p>
                <p className="text-base text-muted-foreground mt-1">You're all caught up!</p>
              </motion.div>
            ) : (
              displayedTasks.map((task) => (
                <motion.div
                  key={task.id}
                  layout
                  variants={item}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  <TaskCard
                    {...task}
                    type={task.type as "assignment" | "quiz"}
                    deadline={new Date(task.deadline)}
                    onComplete={(id) => setTaskToComplete(id)}
                    onDelete={(id) => setTaskToDelete(id)}
                  />
                </motion.div>
              ))
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Add Task Drawer */}
      <AddTaskDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        onAdd={handleAddTask}
      />

      <BottomNav />

      {/* Confirmation Dialogs */}
      <AlertDialog open={!!taskToComplete} onOpenChange={(open) => !open && setTaskToComplete(null)}>
        <AlertDialogContent className="bg-background/90 backdrop-blur-xl border-white/20">
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Complete?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this task as done?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCompleteTask}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!taskToDelete} onOpenChange={(open) => !open && setTaskToDelete(null)}>
        <AlertDialogContent className="bg-background/90 backdrop-blur-xl border-white/20">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the task.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTask} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
