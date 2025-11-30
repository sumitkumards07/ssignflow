import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { storage } from "./storage";

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
