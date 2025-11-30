import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { storage } from "./storage";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const CALLBACK_URL = process.env.NODE_ENV === "production"
    ? `${process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || ""}/api/auth/google/callback`
    : `${process.env.VITE_API_BASE_URL || "http://localhost:5001"}/api/auth/google/callback`;

console.log("OAuth Callback URL:", CALLBACK_URL);

// Only configure OAuth if credentials are provided
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    passport.use(
        new GoogleStrategy(
            {
                clientID: GOOGLE_CLIENT_ID,
                clientSecret: GOOGLE_CLIENT_SECRET,
                callbackURL: CALLBACK_URL,
            },
            async (_accessToken, _refreshToken, profile, done) => {
                try {
                    const googleId = profile.id;
                    const email = profile.emails?.[0]?.value || "";
                    const displayName = profile.displayName || "";

                    // Check if user exists
                    let user = await storage.getUserByGoogleId(googleId);

                    if (!user) {
                        // Create new user
                        user = await storage.createUser({
                            username: email.split("@")[0],
                            password: "", // No password for OAuth users
                            googleId,
                            email,
                            displayName,
                            role: "user",
                        });
                    }

                    return done(null, user);
                } catch (error) {
                    return done(error as Error);
                }
            }
        )
    );

    passport.serializeUser((user: any, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id: string, done) => {
        try {
            const user = await storage.getUser(id);
            done(null, user);
        } catch (error) {
            done(error);
        }
    });
} else {
    console.warn("⚠️  Google OAuth credentials not found. OAuth will not work.");
    console.warn("   Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env file");

    // Provide dummy serialization to prevent passport errors
    passport.serializeUser((user: any, done) => done(null, user));
    passport.deserializeUser((user: any, done) => done(null, user));
}

export default passport;
