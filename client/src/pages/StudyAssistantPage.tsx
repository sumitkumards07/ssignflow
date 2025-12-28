import { StudyAssistant } from "@/components/StudyAssistant";
import { BottomNav } from "@/components/layout/BottomNav";

export default function StudyAssistantPage() {
    return (
        <div className="min-h-dvh bg-background app-shell flex flex-col no-scrollbar overflow-hidden max-w-screen-xl mx-auto w-full">
            <StudyAssistant />
            <BottomNav />
        </div>
    );
}
