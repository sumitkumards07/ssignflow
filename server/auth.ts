import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as LocalStrategy } from "passport-local";
import { storage } from "./storage";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const CALLBACK_URL = "https://assignflow-exuc.onrender.com/api/auth/google/callback";

console.log("OAuth Callback URL:", CALLBACK_URL);

// Local Strategy
passport.use(
    new LocalStrategy(async (username, password, done) => {
        try {
            const user = await storage.getUserByUsername(username);
            if (!user) {
                return done(null, false, { message: "Incorrect username." });
            }
            // Simple plain text comparison for now
            if (user.password !== password) {
                return done(null, false, { message: "Incorrect password." });
            }
            return done(null, user);
        } catch (err) {
            return done(err);
        }
    })
);

// Google Strategy
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
}

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

export default passport;
