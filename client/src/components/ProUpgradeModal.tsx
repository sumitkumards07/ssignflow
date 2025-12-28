import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Zap, Crown, Users, BookOpen } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { getApiBaseUrl } from "@/lib/queryClient";
import { useUser } from "@/hooks/use-user";
import { useRazorpay } from "@/hooks/useRazorpay";



interface ProUpgradeModalProps {
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function ProUpgradeModal({ trigger, open, onOpenChange }: ProUpgradeModalProps) {
    const { toast } = useToast();
    const { user } = useUser();
    const [loading, setLoading] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<"monthly" | "quarterly" | "ultra">("ultra");

    const { initializePayment, isLoading: isPaymentLoading } = useRazorpay();

    const handleSubscribe = async () => {
        if (selectedPlan === 'ultra' || selectedPlan === 'monthly' || selectedPlan === 'quarterly') {
            await initializePayment(selectedPlan);
            if (onOpenChange) onOpenChange(false);
        }
    };

    const benefits = [
        { icon: Zap, text: "Unlimited AI Problem Solving" },
        { icon: Users, text: "Create & Join Unlimited Groups" },
        { icon: BookOpen, text: "Access to Advanced Study Materials" },
        { icon: Crown, text: "Priority Support & Features" },
    ];

    const plans = [
        { id: "ultra", name: "Ultra", price: 29, duration: "Monthly", badge: "LIMITED OFFER", popular: true },
        { id: "monthly", name: "Pro Monthly", price: 99, duration: "30 days" },
        { id: "quarterly", name: "Pro Quarterly", price: 199, duration: "90 days", badge: "Best Value" },
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[425px] bg-card">
                <DialogHeader>
                    <div className="mx-auto bg-amber-500/20 p-4 rounded-full mb-4 w-fit">
                        <Crown className="w-10 h-10 text-amber-500" />
                    </div>
                    <DialogTitle className="text-2xl text-center">Upgrade to Premium</DialogTitle>
                    <DialogDescription className="text-center pt-2">
                        Unlock the full power of AssignFlow.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-4">
                    {benefits.map((benefit, index) => (
                        <div key={index} className="flex items-center gap-3">
                            <div className="bg-primary/10 p-2 rounded-full">
                                <benefit.icon className="w-4 h-4 text-primary" />
                            </div>
                            <span className="text-sm font-medium">{benefit.text}</span>
                        </div>
                    ))}
                </div>

                <div className="space-y-3 mb-4">
                    {plans.map((plan: any) => (
                        <div
                            key={plan.id}
                            onClick={() => setSelectedPlan(plan.id as any)}
                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedPlan === plan.id
                                ? "border-primary bg-primary/5 relative overflow-hidden"
                                : "border-muted hover:border-primary/50"
                                }`}
                        >
                            {plan.popular && selectedPlan === plan.id && (
                                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
                                    SELECTED
                                </div>
                            )}
                            <div className="flex justify-between items-center">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-lg">{plan.name}</span>
                                        {plan.badge && (
                                            <span className={`text-xs px-2 py-0.5 rounded ${plan.id === 'ultra' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-green-500/20 text-green-600'}`}>
                                                {plan.badge}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs text-muted-foreground">{plan.duration}</span>
                                </div>
                                <div className="text-right">
                                    <span className={`text-2xl font-bold ${plan.id === 'ultra' ? 'text-primary' : ''}`}>₹{plan.price}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <Button
                    className="w-full text-lg py-6"
                    onClick={handleSubscribe}
                    disabled={loading || isPaymentLoading}
                >
                    {loading || isPaymentLoading ? "Processing..." : `Get ${selectedPlan === 'ultra' ? 'Ultra' : 'Pro'} - ₹${plans.find(p => p.id === selectedPlan)?.price}`}
                </Button>
            </DialogContent>
        </Dialog>
    );
}
