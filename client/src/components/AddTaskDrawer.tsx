import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { TaskType } from "./TaskCard";
import { Paperclip } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { requestNotificationPermissions, scheduleNotification } from "@/lib/notifications";
import { saveTaskToStorage } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { playAddSound } from "@/lib/sounds";

const formSchema = z.object({
  title: z.string().min(2, "Title is required"),
  type: z.enum(["assignment", "quiz"]),
  courseCode: z.string().optional(),
  remarks: z.string().optional(),
  deadline: z.string().min(1, "Date required"),
  attachment: z.any().optional(),
  notificationTime: z.string(), // stored as string in form, converted to int
});

interface AddTaskDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: any) => void;
}

export function AddTaskDrawer({ open, onOpenChange, onAdd }: AddTaskDrawerProps) {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "assignment",
      notificationTime: "1440", // 24 hours
    },
  });

  useEffect(() => {
    if (open) {
      requestNotificationPermissions();
    }
  }, [open]);

  const taskType = form.watch("type");

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    // 1. Save to Local Storage instead of Server
    const taskWithId = {
      ...data,
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(), // Generate unique ID
      completed: false,
      sectionId: "A1", // Default section ID
    };
    saveTaskToStorage(taskWithId);
    playAddSound();

    // 2. Show a "Success" message manually
    toast({
      title: "Task created!",
      description: "Your task has been saved locally.",
    });

    const notificationMinutes = parseInt(data.notificationTime);
    const deadlineDate = new Date(data.deadline);
    const notificationDate = new Date(deadlineDate.getTime() - notificationMinutes * 60 * 1000);

    // Schedule notification
    const notificationId = Math.floor(Math.random() * 1000000);
    await scheduleNotification(
      notificationId,
      `Task Deadline: ${data.title}`,
      `Your ${data.type} ${data.courseCode ? `for ${data.courseCode} ` : ""}is due in ${notificationMinutes / 60 / 24} days!`,
      notificationDate
    );

    // 3. Refresh the UI (if you have the onAdd prop)
    if (onAdd) {
      onAdd({
        ...taskWithId,
        // Ensure all fields are present
        deadline: data.deadline,
        notificationTime: notificationMinutes,
      });
    }

    // 4. Close the drawer
    onOpenChange(false);

    // 5. Reset the form
    form.reset();
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90dvh] flex flex-col bg-background/80 backdrop-blur-xl border-t border-white/20 overflow-hidden">
        <div className="mx-auto w-full max-w-lg sm:max-w-xl flex flex-col flex-1 min-h-0 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
          <DrawerHeader className="flex-shrink-0">
            <DrawerTitle>Add New Task</DrawerTitle>
            <DrawerDescription>Create a new assignment or quiz deadline.</DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto px-4 min-h-0">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-2 pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
              <div className="space-y-3">
                <Label className="text-base">Task Type</Label>
                <RadioGroup
                  defaultValue="assignment"
                  onValueChange={(v) => form.setValue("type", v as TaskType)}
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="assignment" id="r-assignment" className="h-5 w-5" />
                    <Label htmlFor="r-assignment" className="text-base">Assignment</Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="quiz" id="r-quiz" className="h-5 w-5" />
                    <Label htmlFor="r-quiz" className="text-base">Quiz</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label htmlFor="title" className="text-base">Subject / Title</Label>
                <Input id="title" placeholder="e.g. Calculus for Engineers" className="h-12 text-base" {...form.register("title")} />
                {form.formState.errors.title && <p className="text-sm text-red-500">{form.formState.errors.title.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="courseCode" className="text-base">Course Code <span className="text-muted-foreground text-sm font-normal">(Optional)</span></Label>
                  <Input id="courseCode" placeholder="#MAT1001" className="h-12 text-base" {...form.register("courseCode")} />
                  {form.formState.errors.courseCode && <p className="text-sm text-red-500">{form.formState.errors.courseCode.message}</p>}
                </div>
                <div className="space-y-3">
                  <Label htmlFor="deadline" className="text-base">Deadline</Label>
                  <Input id="deadline" type="date" className="h-12 text-base" {...form.register("deadline")} />
                  {form.formState.errors.deadline && <p className="text-sm text-red-500">{form.formState.errors.deadline.message}</p>}
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="notificationTime" className="text-base">Remind Me</Label>
                <Select
                  onValueChange={(value) => form.setValue("notificationTime", value)}
                  defaultValue={form.getValues("notificationTime")}
                >
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="Select notification time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1440" className="text-base">1 Day Before (24h)</SelectItem>
                    <SelectItem value="2880" className="text-base">2 Days Before (48h)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {taskType === "assignment" && (
                <div className="space-y-3">
                  <Label htmlFor="attachment" className="text-base">Attachment (PDF)</Label>
                  <div className="relative">
                    <Input
                      id="attachment"
                      type="file"
                      accept=".pdf"
                      className="pl-10 h-12 text-base file:text-foreground"
                      {...form.register("attachment")}
                    />
                    <Paperclip className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <Label htmlFor="remarks" className="text-base">Remarks / Syllabus</Label>
                <Textarea id="remarks" placeholder="Chapters 1-3, bring calculator..." className="min-h-[80px] text-base" {...form.register("remarks")} />
              </div>

              <DrawerFooter className="px-0 pt-6 gap-3">
                <Button type="submit" className="w-full h-12 text-base">Add Task</Button>
                <DrawerClose asChild>
                  <Button variant="outline" className="w-full h-12 text-base">Cancel</Button>
                </DrawerClose>
              </DrawerFooter>
            </form>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

