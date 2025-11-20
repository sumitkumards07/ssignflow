import React, { useState } from "react";
import { BottomNav } from "@/components/layout/BottomNav";
import { TaskCard, TaskProps } from "@/components/TaskCard";
import { AddTaskDrawer } from "@/components/AddTaskDrawer";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

// Mock Data
const INITIAL_TASKS: TaskProps[] = [
  {
    id: "1",
    type: "assignment",
    title: "Calculus for Engineers",
    courseCode: "#MAT1001",
    sectionId: "C1",
    deadline: new Date(Date.now() + 86400000 * 2), // 2 days from now
    completed: false,
    attachment: {
      name: "Calculus_Homework_3.pdf",
      url: "#"
    }
  },
  {
    id: "2",
    type: "quiz",
    title: "Physics Mechanics",
    courseCode: "#PHY1002",
    sectionId: "B2",
    deadline: new Date(Date.now() + 86400000 * 5), // 5 days from now
    completed: false,
  },
  {
    id: "3",
    type: "assignment",
    title: "Intro to Programming",
    courseCode: "#CS101",
    sectionId: "A1",
    deadline: new Date(Date.now() + 86400000 * 1), // 1 day from now
    completed: false,
  },
  {
    id: "4",
    type: "quiz",
    title: "Linear Algebra",
    courseCode: "#MAT1002",
    sectionId: "C1",
    deadline: new Date(Date.now() + 86400000 * 10), 
    completed: true,
  }
];

export default function Home() {
  const [tasks, setTasks] = useState<TaskProps[]>(INITIAL_TASKS);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [location] = useLocation();

  const handleAddTask = (newTask: any) => {
    setTasks([...tasks, newTask]);
  };

  const handleCompleteTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: true } : t));
  };

  // Filter logic based on route
  const filteredTasks = tasks.filter(task => {
    if (location === "/completed") return task.completed;
    if (location === "/quiz") return task.type === "quiz" && !task.completed;
    // Default (Home/Upcoming) - show uncompleted assignments and quizzes
    return !task.completed;
  });

  const pageTitle = location === "/completed" ? "Completed" : (location === "/quiz" ? "Quizzes" : "Task");

  return (
    <div className="min-h-screen bg-background pb-24 text-foreground font-sans selection:bg-primary/20">
      {/* Header Section */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md">
        <div className="flex items-center justify-center py-4">
          <div className="rounded-full bg-secondary px-6 py-2">
            <h1 className="text-sm font-bold tracking-wide uppercase">{pageTitle}</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-md px-4 pt-6">
        <AnimatePresence mode="popLayout">
          <div className="space-y-4">
            {filteredTasks.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-12 text-center opacity-50"
              >
                <div className="mb-4 rounded-full bg-secondary/50 p-6">
                  <span className="text-4xl">🎉</span>
                </div>
                <p className="text-lg font-medium">No tasks found</p>
                <p className="text-sm text-muted-foreground">You're all caught up!</p>
              </motion.div>
            ) : (
              filteredTasks.map((task) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  layout
                >
                  <TaskCard 
                    {...task} 
                    onComplete={handleCompleteTask}
                  />
                </motion.div>
              ))
            )}
          </div>
        </AnimatePresence>
      </main>

      <BottomNav onAddClick={() => setIsDrawerOpen(true)} />
      
      <AddTaskDrawer 
        open={isDrawerOpen} 
        onOpenChange={setIsDrawerOpen} 
        onAdd={handleAddTask} 
      />
    </div>
  );
}
