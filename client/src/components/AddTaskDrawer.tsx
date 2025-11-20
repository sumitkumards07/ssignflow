import React from "react";
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

const formSchema = z.object({
  title: z.string().min(2, "Title is required"),
  type: z.enum(["assignment", "quiz"]),
  courseCode: z.string().min(2, "Course code required"),
  sectionId: z.string().optional(),
  remarks: z.string().optional(),
  deadline: z.string().min(1, "Date required"),
  attachment: z.any().optional(),
});

interface AddTaskDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: any) => void;
}

export function AddTaskDrawer({ open, onOpenChange, onAdd }: AddTaskDrawerProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "assignment",
      sectionId: "A1",
    },
  });

  const taskType = form.watch("type");

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    let attachmentData = undefined;
    
    // Mock handling of file upload - in a real app this would upload to server
    if (data.attachment && data.attachment.length > 0) {
      const file = data.attachment[0];
      attachmentData = {
        name: file.name,
        url: URL.createObjectURL(file) // Create a local URL for preview
      };
    }

    onAdd({
      ...data,
      id: Math.random().toString(36).substr(2, 9),
      deadline: new Date(data.deadline),
      completed: false,
      attachment: attachmentData
    });
    form.reset();
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>Add New Task</DrawerTitle>
            <DrawerDescription>Create a new assignment or quiz deadline.</DrawerDescription>
          </DrawerHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-4">
            <div className="space-y-2">
              <Label>Task Type</Label>
              <RadioGroup 
                defaultValue="assignment" 
                onValueChange={(v) => form.setValue("type", v as TaskType)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="assignment" id="r-assignment" />
                  <Label htmlFor="r-assignment">Assignment</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="quiz" id="r-quiz" />
                  <Label htmlFor="r-quiz">Quiz</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Subject / Title</Label>
              <Input id="title" placeholder="e.g. Calculus for Engineers" {...form.register("title")} />
              {form.formState.errors.title && <p className="text-xs text-red-500">{form.formState.errors.title.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="courseCode">Course Code</Label>
                <Input id="courseCode" placeholder="#MAT1001" {...form.register("courseCode")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deadline">Deadline</Label>
                <Input id="deadline" type="date" {...form.register("deadline")} />
              </div>
            </div>

            {taskType === "assignment" && (
              <div className="space-y-2">
                <Label htmlFor="attachment">Attachment (PDF)</Label>
                <div className="relative">
                  <Input 
                    id="attachment" 
                    type="file" 
                    accept=".pdf" 
                    className="pl-9 file:text-foreground" 
                    {...form.register("attachment")} 
                  />
                  <Paperclip className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks / Syllabus</Label>
              <Textarea id="remarks" placeholder="Chapters 1-3, bring calculator..." {...form.register("remarks")} />
            </div>

            <DrawerFooter className="px-0 pt-4">
              <Button type="submit" className="w-full">Add Task</Button>
              <DrawerClose asChild>
                <Button variant="outline" className="w-full">Cancel</Button>
              </DrawerClose>
            </DrawerFooter>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
