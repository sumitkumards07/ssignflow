import { StudyAssistant } from "@/components/StudyAssistant";
import { BottomNav } from "@/components/layout/BottomNav";

export default function StudyAssistantPage() {
    return (
        <div className="min-h-screen bg-background pb-40 text-foreground font-sans selection:bg-primary/20 overflow-hidden max-w-screen-xl mx-auto w-full">
            <StudyAssistant />
            <BottomNav />
        </div>
    );
}
