import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface RazorpayOptions {
    key: string;
    amount: string;
    currency: string;
    name: string;
    description: string;
    image?: string;
    order_id: string;
    handler: (response: any) => void;
    prefill?: {
        name?: string;
        email?: string;
        contact?: string;
    };
    theme?: {
        color: string;
    };
}

declare global {
    interface Window {
        Razorpay: new (options: RazorpayOptions) => any;
    }
}

export function useRazorpay() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const initializePayment = async (plan: 'monthly' | 'quarterly' | 'ultra') => {
        setIsLoading(true);
        try {
            // 1. Create order on backend
            const orderRes = await apiRequest("POST", "/api/razorpay/create-order", { plan });
            const orderData = await orderRes.json();

            if (orderData.mock) {
                // Handle Mock Payment
                await apiRequest("POST", "/api/razorpay/verify", {
                    razorpay_order_id: orderData.id,
                    razorpay_payment_id: "pay_mock_" + Date.now(),
                    razorpay_signature: "mock_sig",
                    plan,
                    mock_success: true
                });
                toast({
                    title: "Pro Activated (Mock)",
                    description: "Your subscription is now active!",
                });
                window.location.href = "/settings?payment=success";
                return;
            }

            // 2. Options for Razorpay
            const options: RazorpayOptions = {
                key: orderData.key_id,
                amount: orderData.amount.toString(),
                currency: orderData.currency,
                name: "AssignFlow Pro",
                description: plan === 'ultra' ? "AssignFlow Ultra" : (plan === 'monthly' ? "Monthly Subscription" : "Quarterly Subscription"),
                order_id: orderData.id,
                handler: async (response: any) => {
                    try {
                        const verifyRes = await apiRequest("POST", "/api/razorpay/verify", {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            plan
                        });

                        if (verifyRes.ok) {
                            toast({
                                title: "Payment Successful",
                                description: "Welcome to AssignFlow Pro!",
                            });
                            // Redirect or refresh state
                            window.location.reload();
                        } else {
                            throw new Error("Verification failed");
                        }
                    } catch (error) {
                        toast({
                            title: "Payment Verification Failed",
                            description: "Please contact support.",
                            variant: "destructive"
                        });
                    }
                },
                theme: {
                    color: "#F97316" // Orange like the app
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.open();

        } catch (error: any) {
            toast({
                title: "Payment Error",
                description: error.message || "Failed to initiate payment",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    return { initializePayment, isLoading };
}
