import UserModel from "../models/Users.js";
import AuthModel from "../models/Auth.js";
import sendMail from "../config/email.js";
import { genJwtToken, jwtVerifier, isJWTExpired, jwtDecoder } from "../config/authentication.js";
import { email_verification_template } from "../helper/html_template.js";


export const signup = async (req, res) => {
    const { email, username, password, phone, fname, lname } = req.body;
    try {
        const existingUser = await UserModel.findOne({ email }, "_id");
        const existingUserName = await UserModel.findOne({ username });
        if (existingUser) return res.status(400).json({ message: 'User already exists', isUser: true });
        if (existingUserName) return res.status(400).json({ message: 'Username already exists', isusername: true });
        const newUser = new UserModel({ email, username, password, phone, firstname: fname, lastname: lname });
        const savedUser = await newUser.save();
        const verificationToken = genJwtToken({ id: savedUser._id });
        const newUserMetData = new AuthModel({
            _id: savedUser._id,
            verificationToken: verificationToken,
        });
        await newUserMetData.save();
        const verificationUrl = `https://${req.hostname}/auth/verify/${verificationToken}`;
        await sendMail({
            to: email,
            subject: 'please verify your email from ecomx',
            text: `Please verify your email by clicking this link: ${verificationUrl}`,
            html: email_verification_template(verificationUrl, `${fname} ${lname}`, req.hostname)

        })
        res.status(201).json({ status: "success", message: 'User created successfully, please verify your email.' });
    } catch (error) {
        res.status(500).json({ status: "failed", message: `Server ${error}` });
    }
};
export const verifyEmail = async (req, res) => {
    const { token } = req.params;
    try {
        const decoded = jwtVerifier(token);
        const user = await UserModel.findById(decoded.id);
        const authMetaData = await AuthModel.findById(user._id);
        if (!user || authMetaData.verificationToken !== token || isJWTExpired(authMetaData.verificationToken).status) {
            return res.status(400).json({ status: "failed", message: 'Invalid or expired token' });
        }
        user.isVerified = true;
        authMetaData.verificationToken = undefined;
        authMetaData.signedup = { ...req.useragent };
        await user.save();
        await authMetaData.save();
        res.status(200).json({ status: "success", message: 'Email verified successfully' });
    } catch (error) {
        res.status(500).json({ status: "failed", message: 'Server error' });
    }
};
export const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await UserModel.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }
        const metaData = await AuthModel.findById(user._id);
        if(metaData.forgotPassword){
            metaData.forgotPassword = undefined; 
            await metaData.save();
        }
        if (!user.isVerified) {
            if (!metaData.verificationToken || isJWTExpired(metaData.verificationToken).status) {
                const newVerificationToken = genJwtToken({ id: user._id });
                user.verificationToken = newVerificationToken;
                await user.save();
                const verificationUrl = `https://${req.hostname}/auth/verify/${newVerificationToken}`;
                await sendMail({
                    to: email,
                    subject: 'Verify your email (Reverification) from ecomx',
                    text: `Please verify your email by clicking this link: ${verificationUrl}`,
                    html: email_verification_template(verificationUrl, `${user.firstname} ${user.lastname}`, req.hostname)
                });

                return res.status(400).json({ status: "success", message: 'Verification email expired. A new verification email has been sent to your inbox.' });
            }

            return res.status(400).json({ status: "failed", message: 'User not verified. Please check your email for verification.' });
        }
        const isMatch = await user.comparePassword(password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });
        const mongoId = req.genMongooseid
        const newAccessToken = genJwtToken({ id: user._id, id2: mongoId })
        const newRefreshToken = genJwtToken({ id: user._id, id2: mongoId },
            process.env.REFRESH_TOKEN_SECRET_KEY,
            process.env.JWT_REFRESH_TOKEN_LIFE
        );
        if (metaData.loggedin.length === 0) {
            metaData.loggedin.push({
                _id: mongoId,
                metadata: { ...req.useragent },
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
            });
            await metaData.save();
            res.cookie('refreshToken', newRefreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: 'None',
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });
            return res.status(200).json({ status: "success", accessToken: newAccessToken });
        }
        const isRefreshToken = req.cookies.refreshToken;
        const extractRFT = jwtDecoder(req.cookies.refreshToken);
        async function isUserAuthPresent() {
            try {
                if (isRefreshToken) {
                    const authFind = await AuthModel.findOne(
                        { _id: extractRFT.id, "loggedin._id": extractRFT.id2 },
                        { loggedin: { $elemMatch: { _id: extractRFT.id2 } } }
                    );
                    return authFind ? true : false;
                }
                return false;
            } catch (e) {
                return false;
            }
        }
        if (await isUserAuthPresent()) {
            const authFind = await AuthModel.findOne(
                { _id: extractRFT.id, "loggedin._id": extractRFT.id2 },
                { loggedin: { $elemMatch: { _id: extractRFT.id2 } } }
            );
            const result = authFind?.loggedin[0]
            const mAccessToken = genJwtToken({ id: user._id, id2: result._id })
            if (result.refreshToken === isRefreshToken) {
                if (!isJWTExpired(isRefreshToken, process.env.REFRESH_TOKEN_SECRET_KEY).status) {
                    if (isJWTExpired(result.accessToken).status) {
                        await AuthModel.updateOne(
                            { _id: user._id, 'loggedin._id': result._id },
                            { $set: { 'loggedin.$.accessToken': mAccessToken } }
                        );
                        return res.status(200).json({ status: "success", AccessToken: mAccessToken });
                    }
                    return res.status(200).json({ status: true, accesstoken: result.accessToken }); //it already present in cookies

                } else {
                    const mRefreshToken = genJwtToken({ id: user._id, id2: result._id },
                        process.env.REFRESH_TOKEN_SECRET_KEY,
                        process.env.JWT_REFRESH_TOKEN_LIFE
                    );
                    await AuthModel.updateOne(
                        { _id: user._id, 'loggedin._id': result._id },
                        {
                            $set: {
                                'loggedin.$.accessToken': mAccessToken,
                                'loggedin.$.refreshToken': mRefreshToken
                            }
                        }
                    );
                    res.cookie('refreshToken', mRefreshToken, {
                        httpOnly: true,
                        secure: true,
                        sameSite: 'None',
                        maxAge: 7 * 24 * 60 * 60 * 1000,
                    });
                    return res.status(200).json({ status: true, mAccessToken });
                }
            }
        }
        metaData.loggedin.push({
            _id: mongoId,
            metadata: { ...req.useragent },
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        });
        await metaData.save();
        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'None',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        return res.status(200).json({ status: "success", newAccessToken });
    } catch (error) {
        console.log({ [error.name]: error.message });
        res.status(500).json({ status: "failed", message: `Server ${error}` });
    }
};
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body 
        const existingUser = await UserModel.findOne({ email, deleted: false, isVerified: true });
        const metaData = await AuthModel.findById(existingUser._id);
        if (existingUser && metaData) {
            const VerifyToken = genJwtToken({ id: existingUser.id });
            metaData.forgotPassword = VerifyToken;
            await metaData.save();
            const resetUrl = `https://${req.hostname}/auth/forgotpassword/${VerifyToken}`;
            await sendMail({
                to: email,
                subject: 'Reset your password',
                text: `Please reset your password by clicking this link: ${resetUrl}`,
            })
           return res.status(200).json({ status: "success", message: 'Password reset link sent to your email' });
        };
       return res.status(200).json({ status: "success", message: 'Password reset link sent to your email' });

    } catch (e) {
        console.log({ [e.name]: e.message });
        return res.status(400).json({ status: "failed", message: 'server error' });

    }
};

export const forgotPasswordVerification=async(req,res)=>{
    try{
        const {token} = req.params;
        const { password } = req.body;
        const decoded = jwtVerifier(token);
        const existingUser = await UserModel.findById(decoded.id);
        const authMetaData = await AuthModel.findOne({_id:decoded.id,forgotPassword:token});
        if(existingUser && authMetaData){
           existingUser.password = password;
           authMetaData.loggedin = new Array();
           authMetaData.forgotPassword = undefined;
            await existingUser.save();
            await authMetaData.save();
            return res.status(200).json({ status: "success", message: 'password reseted' });
        }
        return res.status(400).json({ status: "success", message: 'password reseted expired' });
    }catch(e){
        console.log({ [e.name]:e.message});
        return res.status(400).json({ status: "failed", message: 'server error' });
    }
}

//Generator Rcefresh Tokeni
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
}

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

