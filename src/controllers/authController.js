import UserModel from "../models/Users.js";
import sendMail from "../config/email.js";
import { genJwtToken, jwtVerifier, isJWTExpired } from "../config/authentication.js";
import { email_verification_template } from "../helper/html_template.js";

// Sign Up
//need to change here.
export const signup = async (req, res) => {
    const { email, username, password, phone, fname, lname } = req.body;
    try {
        const existingUser = await UserModel.findOne({ email });
        const existingUserName = await UserModel.findOne({ username });
        if (existingUser) return res.status(400).json({ message: 'User already exists' });
        if (existingUserName) return res.status(400).json({ message: 'Username already exists' });

        const newUser = new UserModel({ email, username, password, phone, firstname: fname, lastname: lname });
        const savedUser = await newUser.save();
        // Generate a verification token
        const verificationToken = genJwtToken({ id: savedUser._id });
        savedUser.verificationToken = verificationToken;
        savedUser.verificationTokenExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes
        await savedUser.save();

        // Send verification email
        const verificationUrl = `https://${req.host}/auth/verify/${verificationToken}`;
        await sendMail({
            to: email,
            subject: 'Verify your email',
            text: `Please verify your email by clicking this link: ${verificationUrl}`,
            html: email_verification_template(verificationUrl, `${fname} ${lname}`, req.host)

        })
        res.status(201).json({ status: "success", message: 'User created successfully, please verify your email.' });
    } catch (error) {
        res.status(500).json({ status: "failed", message: 'Server error' });
    }
};

// Email Verification
export const verifyEmail = async (req, res) => {
    const { token } = req.params;

    try {
        const decoded = jwtVerifier(token);
        const user = await UserModel.findById(decoded.id);

        if (!user || !user.verificationToken || user.verificationToken !== token || Date.now() > user.verificationTokenExpiry) {
            return res.status(400).json({ status: "failed", message: 'Invalid or expired token' });
        }

        user.isVerified = true;
        user.verificationToken = undefined; // Clear the verification token
        user.verificationTokenExpiry = undefined; // Clear the expiry
        await user.save();

        res.status(200).json({ status: "success", message: 'Email verified successfully' });
    } catch (error) {
        res.status(500).json({ status: "failed", message: 'Server error' });
    }
};

// Login
export const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await UserModel.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        if (!user.isVerified) {
            if (!user.verificationToken || Date.now() > user.verificationTokenExpiry) {
                const newVerificationToken = genJwtToken({ id: user._id });
                user.verificationToken = newVerificationToken;
                user.verificationTokenExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes from now
                await user.save();

                const verificationUrl = `https://${req.host}/auth/verify/${newVerificationToken}`;
                await sendMail({
                    to: email,
                    subject: 'Verify your email (Reverification)',
                    text: `Please verify your email by clicking this link: ${verificationUrl}`,
                    html: email_verification_template(verificationUrl, `${user.firstname} ${user.lastname}`, req.host)
                });

                return res.status(400).json({ status: "success", message: 'Verification email expired. A new verification email has been sent to your inbox.' });
            }

            return res.status(400).json({ status: "failed", message: 'User not verified. Please check your email for verification.' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        //<RFT> = ReFresh Token
        const isRFTExpired = isJWTExpired(user.refreshToken,process.env.REFRESH_TOKEN_SECRET_KEY)
        const accessToken = genJwtToken({ id: user._id });
        if (isRFTExpired["status"]) {
            const accessToken = genJwtToken({ id: user._id });
            const refreshToken = genJwtToken(
                { id: user._id },
                process.env.REFRESH_TOKEN_SECRET_KEY,
                process.env.JWT_REFRESH_TOKEN_LIFE
            );
            user.refreshToken = refreshToken;
            await user.save();
            // Set refresh token in HttpOnly cookie
            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: true,  // Only set secure cookies in production with HTTPS // process.env.production === "production"
                sameSite: 'None',  // Required for cross-origin requests
                maxAge: 7 * 24 * 60 * 60 * 1000,  // 1 week
            });
            return  res.status(200).json({ status: "success", accessToken });
        }

        res.cookie('refreshToken', user.refreshToken, {
            httpOnly: true,
            secure: true,  
            sameSite: 'None', 
            maxAge: 7 * 24 * 60 * 60 * 1000,  // 1 week
        });

        return  res.status(200).json({ status: "success", accessToken });
    } catch (error) {
        res.status(500).json({ status: "failed", message: 'Server error' });
    }
};


// Request Password Reset
export const requestPasswordReset = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await UserModel.findOne({ email });
        if (!user) return res.status(400).json({ message: 'User not found' });

        // Generate a reset token
        const resetToken = genJwtToken({ id: user._id });
        user.resetToken = resetToken;
        user.resetTokenExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes
        await user.save();

        // Send password reset email
        const resetUrl = `https://${req.host}/auth/reset-password/${resetToken}`;
        await sendMail({
            to: email,
            subject: 'Reset your password',
            text: `Please reset your password by clicking this link: ${resetUrl}`,
        })

        res.status(200).json({ status: "success", message: 'Password reset link sent to your email' });
    } catch (error) {
        res.status(500).json({ status: "failed", message: 'Server error' });
    }
};

// Reset Password
export const resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;

    try {
        const decoded = jwtVerifier(token);
        const user = await UserModel.findById(decoded.id);

        if (!user || !user.resetToken || user.resetToken !== token || Date.now() > user.resetTokenExpiry) {
            return res.status(400).json({ status: "failed", message: 'Invalid or expired token' });
        }

        user.password = newPassword;
        user.resetToken = undefined; // Clear the reset token
        user.resetTokenExpiry = undefined; // Clear the expiry
        await user.save();

        res.status(200).json({ status: "success", message: 'Password reset successfully' });
    } catch (error) {
        res.status(500).json({ status: "failed", message: 'Server error' });
    }
};

export const refreshToken = async (req, res) => {
    const { token } = req.cookies;  // Get refresh token from cookies
    if (!token) return res.status(401).json({ message: 'Refresh token required' });
    try {
        const decoded = jwtVerifier(token, process.env.REFRESH_TOKEN_SECRET_KEY);
        const user = await UserModel.findById(decoded.id);
        if (!user) return res.status(403).json({ message: 'User not found' });

        // Check if the provided refresh token matches the one stored in the database
        if (user.refreshToken !== token) {
            return res.status(403).json({ message: 'Invalid refresh token' });
        }



        const accessToken = genJwtToken({ id: user._id });
        // Optionally: Generate a new refresh token (token rotation)
        const newRefreshToken = genJwtToken(
            { id: user._id },
            process.env.REFRESH_TOKEN_SECRET_KEY,
            process.env.JWT_REFRESH_TOKEN_LIFE
        );
        user.refreshToken = newRefreshToken;
        await user.save();

        // Set new refresh token in HttpOnly cookie
        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'None',
            maxAge: 7 * 24 * 60 * 60 * 1000,  // 1 week
        });

        // Send new access token in response body
        res.status(200).json({ status: "success", accessToken });
    } catch (error) {
        res.status(403).json({ status: "failed", message: 'Invalid or expired refresh token' });
    }
};


// Logout Endpoint
export const logoutAll = async (req, res) => {
    const { token } = req.body;
    try {
        const user = await UserModel.findOneAndUpdate({ refreshToken: token }, { refreshToken: '' });
        // const decoded = jwtVerifier(token, process.env.REFRESH_TOKEN_SECRET_KEY);
        // const user = await UserModel.findById(decoded.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        // user.refreshToken = undefined;
        // await user.save();
        res.status(200).json({ status: "success", message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ status: "failed", message: 'Server error' });
    }
};
