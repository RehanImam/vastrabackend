// import passport from "passport";
// import { Strategy as GoogleStrategy } from "passport-google-oauth20";
// import { User } from "../models/user.model.js";

// passport.use(
//     new GoogleStrategy(
//         {
//             clientID: process.env.GOOGLE_CLIENT_ID,
//             clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//             callbackURL: process.env.GOOGLE_CALLBACK_URL,
//         },
//         async (_accessToken, _refreshToken, profile, done) => {
//             try {
//                 // Check if user already exists with this Google ID
//                 let user = await User.findOne({ googleId: profile.id });

//                 if (user) {
//                     return done(null, user);
//                 }

//                 // Check if user exists with the same email (signed up with email/password)
//                const emailObj = profile.emails?.find((e) => e.verified) || profile.emails?.[0];
//                 const email = emailObj?.value;
//                 if (email) {
//                     user = await User.findOne({ email });

//                     if (user) {
//                         // Link Google account to existing user
//                         user.googleId = profile.id;
//                         user.loginType = "GOOGLE";
//                         user.isEmailVerified = true;
//                         await user.save({ validateBeforeSave: false });
//                         return done(null, user);
//                     }
//                 }
//                 const baseName = profile.displayName 
//                     ? profile.displayName.toLowerCase().replace(/\s+/g, "_") 
//                     : "user";
//                 const fallbackUsername = `${baseName}_${profile.id.slice(-4)}`;
//                 // Create a new user
//                user = await User.create({
//                     username: fallbackUsername,
//                     email: email,
//                     googleId: profile.id,
//                     loginType: "GOOGLE",
//                     isEmailVerified: true,
//                 });

//                 return done(null, user);
//             } catch (error) {
//                 return done(error, null);
//             }
//         }
//     )
// );
