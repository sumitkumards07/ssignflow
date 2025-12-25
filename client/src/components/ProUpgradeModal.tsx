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
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { getApiBaseUrl } from "@/lib/queryClient";

interface ProUpgradeModalProps {
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function ProUpgradeModal({ trigger, open, onOpenChange }: ProUpgradeModalProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    const handleSubscribe = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${getApiBaseUrl()}/api/payments/create-checkout-session`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ priceId: "price_1Monthly" }), // Replace with actual ID
            });

            const text = await response.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                // If not JSON, it's likely an HTML error page or empty
                console.error("Non-JSON response:", text);
                throw new Error(`Server Error: ${text.substring(0, 100)}...`);
            }

            if (!response.ok) {
                throw new Error(data.message || data.error || "Payment initiation failed");
            }

            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error("No checkout URL returned");
            }
        } catch (error: any) {
            console.error("Payment error:", error);
            toast({
                title: "Payment Error",
                description: error.message || "Unknown error occurred",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const benefits = [
        { icon: Zap, text: "Unlimited AI Problem Solving" },
        { icon: Users, text: "Create & Join Unlimited Groups" },
        { icon: BookOpen, text: "Access to Advanced Study Materials" },
        { icon: Crown, text: "Priority Support & Features" },
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[425px] bg-card">
                <DialogHeader>
                    <div className="mx-auto bg-primary/10 p-4 rounded-full mb-4 w-fit">
                        <Crown className="w-10 h-10 text-primary" />
                    </div>
                    <DialogTitle className="text-2xl text-center">Upgrade to Pro</DialogTitle>
                    <DialogDescription className="text-center pt-2">
                        Unlock the full power of AssignFlow.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {benefits.map((benefit, index) => (
                        <div key={index} className="flex items-center gap-3">
                            <div className="bg-primary/10 p-2 rounded-full">
                                <benefit.icon className="w-4 h-4 text-primary" />
                            </div>
                            <span className="text-sm font-medium">{benefit.text}</span>
                        </div>
                    ))}
                </div>

                <div className="bg-muted p-4 rounded-lg flex justify-between items-center mb-4">
                    <div>
                        <span className="block text-2xl font-bold">₹199</span>
                        <span className="text-xs text-muted-foreground">per month</span>
                    </div>
                    <div className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                        Most Popular
                    </div>
                </div>

                <Button
                    className="w-full text-lg py-6"
                    onClick={handleSubscribe}
                    disabled={loading}
                >
                    {loading ? "Processing..." : "Get Pro Access"}
                </Button>
            </DialogContent>
        </Dialog>
    );
}
