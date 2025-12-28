import { Router } from "express";
import Razorpay from "razorpay";
import { db } from "./db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

// Initialize Razorpay
// Note: User must provide these env vars
const key_id = process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder";
const key_secret = process.env.RAZORPAY_KEY_SECRET || "secret_placeholder";

const razorpay = new Razorpay({
    key_id: key_id,
    key_secret: key_secret,
});

// Price plans in Paisa (100 paisa = 1 INR)
// Pro Monthly: 99 INR -> 9900 paisa
// Pro Quarterly: 199 INR -> 19900 paisa
const PLANS = {
    monthly: { amount: 9900, duration: 30, name: "Pro Monthly" },
    quarterly: { amount: 19900, duration: 90, name: "Pro 3 Months" },
    ultra: { amount: 2900, duration: 30, name: "AssignFlow Ultra" }
};

// Endpoint to create an order
router.post("/create-order", async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
    }

    const { plan } = req.body; // 'monthly' or 'quarterly'
    const selectedPlan = PLANS[plan as keyof typeof PLANS] || PLANS.monthly;

    try {
        const options = {
            amount: selectedPlan.amount,
            currency: "INR",
            receipt: `receipt_${(req.user as any).id}_${Date.now()}`,
            payment_capture: 1 // Auto capture
        };

        if (key_id === "rzp_test_placeholder") {
            console.log("[MOCK] Razorpay Create Order for:", (req.user as any).username);
            // Return a mock order for testing UI flow if keys aren't set
            return res.json({
                id: `order_mock_${Date.now()}`,
                currency: "INR",
                amount: selectedPlan.amount,
                mock: true
            });
        }

        const response = await razorpay.orders.create(options);
        res.json({
            id: response.id,
            currency: response.currency,
            amount: response.amount,
            key_id: key_id // Send key to client for checkout init
        });

    } catch (error: any) {
        console.error("Razorpay Order Creation Error:", error);
        res.status(500).json({ message: error.message });
    }
});

// Endpoint to verify payment signature
router.post("/verify", async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body;
    const user = req.user as any;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        // Handle Mock Success for testing
        if (req.body.mock_success && key_id === "rzp_test_placeholder") {
            await grantProAccess(user.id, plan);
            return res.json({ status: "success", message: "Mock Payment Verified" });
        }
        return res.status(400).json({ message: "Missing payment details" });
    }

    try {
        // Verify Signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", key_secret)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature === razorpay_signature) {
            // Valid Payment
            await grantProAccess(user.id, plan);

            console.log(`[RAZORPAY] Payment verified for user ${user.id}`);
            res.json({ status: "success" });
        } else {
            console.warn(`[RAZORPAY] Invalid signature for user ${user.id}`);
            res.status(400).json({ status: "failure", message: "Invalid signature" });
        }
    } catch (error: any) {
        console.error("Razorpay Verification Error:", error);
        res.status(500).json({ message: error.message });
    }
});

async function grantProAccess(userId: string, planKey: string) {
    const selectedPlan = PLANS[planKey as keyof typeof PLANS] || PLANS.monthly;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + selectedPlan.duration);

    await db.update(users)
        .set({
            isPro: true,
            proExpiresAt: expiresAt.toISOString()
        })
        .where(eq(users.id, userId));
}

export default router;
