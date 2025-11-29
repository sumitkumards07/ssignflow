import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export const saveTaskToStorage = (task: any) => {
  try {
    // 1. Get existing tasks (or empty list if none exist)
    const existing = localStorage.getItem("my_tasks");
    let list: any[] = [];

    if (existing) {
      try {
        list = JSON.parse(existing);
        // Validate it's an array
        if (!Array.isArray(list)) {
          console.warn("Invalid data in localStorage, resetting to empty array");
          list = [];
        }
      } catch (parseError) {
        console.error("Error parsing localStorage data, resetting:", parseError);
        list = [];
      }
    }

    // 2. Add the new task
    list.push(task);

    // 3. Save it back to storage
    localStorage.setItem("my_tasks", JSON.stringify(list));
    console.log("Task saved to local storage!");
  } catch (error) {
    console.error("Error saving task", error);
    // Clear corrupted data
    try {
      localStorage.removeItem("my_tasks");
    } catch (clearError) {
      console.error("Error clearing localStorage", clearError);
    }
  }
};

export const getTasksFromStorage = () => {
  try {
    const existing = localStorage.getItem("my_tasks");
    if (!existing) {
      return [];
    }

    try {
      const parsed = JSON.parse(existing);
      // Validate it's an array
      if (!Array.isArray(parsed)) {
        console.warn("Invalid data format in localStorage, returning empty array");
        localStorage.removeItem("my_tasks");
        return [];
      }
      return parsed;
    } catch (parseError) {
      console.error("Error parsing localStorage data:", parseError);
      // Clear corrupted data
      localStorage.removeItem("my_tasks");
      return [];
    }
  } catch (error) {
    console.error("Error loading tasks", error);
    return [];
  }
};


export const saveTodoToStorage = (todo: any) => {
  try {
    const existing = localStorage.getItem("my_todos");
    let list: any[] = [];

    if (existing) {
      try {
        list = JSON.parse(existing);
        if (!Array.isArray(list)) list = [];
      } catch (e) {
        list = [];
      }
    }

    list.push(todo);
    localStorage.setItem("my_todos", JSON.stringify(list));
  } catch (error) {
    console.error("Error saving todo", error);
  }
};

export const getTodosFromStorage = () => {
  try {
    const existing = localStorage.getItem("my_todos");
    if (!existing) return [];

    try {
      const parsed = JSON.parse(existing);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  } catch (error) {
    return [];
  }
};

export const updateTodosInStorage = (todos: any[]) => {
  try {
    localStorage.setItem("my_todos", JSON.stringify(todos));
  } catch (error) {
    console.error("Error updating todos", error);
  }
};
