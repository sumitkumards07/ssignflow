import { StudyAssistant } from "@/components/StudyAssistant";
import { BottomNav } from "@/components/layout/BottomNav";

export default function StudyAssistantPage() {
    return (
        <div className="min-h-screen bg-background pb-32 text-foreground font-sans selection:bg-primary/20 overflow-hidden">
            <StudyAssistant />
            <BottomNav />
        </div>
    );
}
