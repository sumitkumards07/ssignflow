import { Router } from "express";
import Stripe from "stripe";
import { db } from "./db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
    console.warn("WARNING: STRIPE_SECRET_KEY is not set. Payment features will fail.");
}

const stripe = new Stripe(stripeKey || "sk_test_placeholder", {
    apiVersion: "2025-12-15.clover",
});

// Price plans in INR (paisa = rupees * 100)
const PLANS = {
    monthly: { amount: 9900, duration: 30, name: "Pro Monthly - 99 INR" },
    quarterly: { amount: 19900, duration: 90, name: "Pro 3 Months - 199 INR" }
};

// Endpoint to create a checkout session
router.post("/create-checkout-session", async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user as any;
    const { plan } = req.body; // 'monthly' or 'quarterly'

    const selectedPlan = PLANS[plan as keyof typeof PLANS] || PLANS.monthly;

    try {
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.headers['x-forwarded-host'] || req.get('host');
        const baseUrl = `${protocol}://${host}`;

        if (!process.env.STRIPE_SECRET_KEY) {
            // MOCK MODE for Development
            console.log("Mocking Stripe Checkout for user:", user.username);
            return res.json({
                url: `${baseUrl}/api/payments/mock-success?userId=${user.id}&plan=${plan}`
            });
        }

        // Create a one-time payment session with dynamic price
        const session = await stripe.checkout.sessions.create({
            billing_address_collection: 'auto',
            line_items: [
                {
                    price_data: {
                        currency: 'inr',
                        product_data: {
                            name: selectedPlan.name,
                            description: `AssignFlow Pro access for ${selectedPlan.duration} days`
                        },
                        unit_amount: selectedPlan.amount, // Amount in paisa
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment', // One-time payment instead of subscription
            success_url: `${baseUrl}/api/payments/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${baseUrl}/api/payments/cancel`,
            client_reference_id: user.id,
            metadata: {
                userId: user.id,
                username: user.username,
                plan: plan,
                durationDays: selectedPlan.duration.toString()
            }
        });

        res.json({ url: session.url });
    } catch (error: any) {
        console.error("Stripe Checkout Error:", error);
        res.status(500).json({ message: error.message });
    }
});

// Success handler - Grant Pro access
router.get("/success", async (req, res) => {
    const sessionId = req.query.session_id as string;

    try {
        if (process.env.STRIPE_SECRET_KEY && sessionId) {
            const session = await stripe.checkout.sessions.retrieve(sessionId);
            const userId = session.client_reference_id;
            const durationDays = parseInt(session.metadata?.durationDays || "30");

            if (userId && session.payment_status === 'paid') {
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + durationDays);

                await db.update(users)
                    .set({
                        isPro: true,
                        proExpiresAt: expiresAt.toISOString()
                    })
                    .where(eq(users.id, userId));

                console.log(`User ${userId} upgraded to Pro until ${expiresAt.toISOString()}`);
            }
        }

        const clientUrl = process.env.CLIENT_URL || "https://ywal432feojibun3d7jziamzbq0zwiew.lambda-url.us-east-1.on.aws";
        res.redirect(`${clientUrl}/settings?payment=success`);
    } catch (error) {
        console.error("Payment success handler error:", error);
        res.redirect("/settings?payment=error");
    }
});

// Mock Success Route (for development)
router.get("/mock-success", async (req, res) => {
    const userId = req.query.userId as string;
    const plan = req.query.plan as string;
    const durationDays = plan === 'quarterly' ? 90 : 30;

    if (userId) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + durationDays);

        await db.update(users)
            .set({
                isPro: true,
                proExpiresAt: expiresAt.toISOString()
            })
            .where(eq(users.id, userId));

        console.log(`[MOCK] User ${userId} upgraded to Pro until ${expiresAt.toISOString()}`);

        const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
        return res.redirect(`${clientUrl}/settings?payment=success`);
    }
    res.redirect("/");
});

// Cancel handler
router.get("/cancel", (req, res) => {
    const clientUrl = process.env.CLIENT_URL || "https://ywal432feojibun3d7jziamzbq0zwiew.lambda-url.us-east-1.on.aws";
    res.redirect(`${clientUrl}/settings?payment=cancelled`);
});

// Webhook for Stripe events (optional, for async verification)
router.post("/webhook", async (req, res) => {
    const sig = req.headers['stripe-signature'];
    // Verify signature and handle events
    res.json({ received: true });
});

export default router;
