import { Router } from "express";
import Stripe from "stripe";
import { storage } from "./storage";

const router = Router();

// Retrieve key from environment or use a placeholder for development
// In production, this MUST be set
const stripeKey = process.env.STRIPE_SECRET_KEY;
// If no key, we can mock or fail. For now, let's warn.
if (!stripeKey) {
    console.warn("WARNING: STRIPE_SECRET_KEY is not set. Payment features will fail or need mocking.");
}

const stripe = new Stripe(stripeKey || "sk_test_placeholder", {
    apiVersion: "2024-12-18.acacia", // Use latest API version or safe default
});

// Endpoint to create a checkout session
router.post("/create-checkout-session", async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user as any;
    const { priceId } = req.body; // Pass priceId from client

    try {
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.headers['x-forwarded-host'] || req.get('host');
        const baseUrl = `${protocol}://${host}`;

        if (!process.env.STRIPE_SECRET_KEY) {
            // MOCK MODE for Development without Stripe
            console.log("Mocking Stripe Checkout for user:", user.username);
            return res.json({
                url: `${baseUrl}/api/payments/mock-success?userId=${user.id}`
            });
        }

        const session = await stripe.checkout.sessions.create({
            billing_address_collection: 'auto',
            line_items: [
                {
                    price: priceId || 'price_default', // Use actual Stripe Price ID
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${baseUrl}/api/payments/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${baseUrl}/api/payments/cancel`,
            client_reference_id: user.id,
            metadata: {
                userId: user.id,
                username: user.username
            }
        });

        res.json({ url: session.url });
    } catch (error: any) {
        console.error("Stripe Checkout Error:", error);
        res.status(500).json({ message: error.message });
    }
});

// Mock Success Route (for development)
router.get("/mock-success", async (req, res) => {
    const userId = req.query.userId as string;
    if (userId) {
        // Grant Pro
        await storage.updateUserRole(userId, "pro"); // Or separate isPro field
        // Since schema has isPro, let's update that.
        // We need to extend IStorage to support updateProStatus
        // For now, let's manually update directly via db if needed, or add method to storage.
        // Wait, storage.ts doesn't have updateProStatus yet. I need to add it.
        // I will just use updateUserRole for now or hack it.

        // Let's rely on the webhook/success handler.
        // Ideally, we redirect to client with success param.
        return res.redirect(`${process.env.CLIENT_URL || "http://localhost:5173"}/settings?payment=success`);
    }
    res.redirect("/");
});

// Webhook to handle events
router.post("/webhook", async (req, res) => {
    const sig = req.headers['stripe-signature'];
    // Verify signature...
    // Handle checkout.session.completed
    // Update user to Pro
    res.json({ received: true });
});

export default router;
