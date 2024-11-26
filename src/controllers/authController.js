import UserModel from "../models/Users.js";
import AuthModel from "../models/Auth.js";
import sendMail from "../config/email.js";
import { genJwtToken, jwtVerifier, isJWTExpired, jwtDecoder } from "../config/authentication.js";
import { email_verification_template } from "../helper/html_template.js";

export const signup = async (req, res) => {
    try {
        const { email, username, password, phone, fname, lname } = req.body;
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
    try {
        const { email, password } = req.body;
        const user = await UserModel.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }
        const metaData = await AuthModel.findById(user._id);
        if (metaData.forgotPassword) {
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
        async function isUserAuthToken() {
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
        if (await isUserAuthToken()) {
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
                    return res.status(200).json({ status: true, accesstoken: result.accessToken }); 

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
export const forgotPasswordVerification = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;
        const decoded = jwtVerifier(token);
        const existingUser = await UserModel.findById(decoded.id);
        const authMetaData = await AuthModel.findOne({ _id: decoded.id, forgotPassword: token });
        if (existingUser && authMetaData) {
            existingUser.password = password;
            authMetaData.loggedin = new Array();
            authMetaData.forgotPassword = undefined;
            await existingUser.save();
            await authMetaData.save();
            return res.status(200).json({ status: "success", message: 'password reseted' });
        }
        return res.status(400).json({ status: "success", message: 'password reseted expired' });
    } catch (e) {
        console.log({ [e.name]: e.message });
        return res.status(400).json({ status: "failed", message: 'server error' });
    }
};
export const refreshToken = async (req, res) => {
    try {
        const isRefreshToken = req.cookies.refreshToken;
        const extractRFT = jwtDecoder(req.cookies.refreshToken);
        const existingUser = await UserModel.findOne({ _id:extractRFT.id,isVerified:true,deleted:false });
        if (!existingUser) {
            return res.status(400).json({ status:"failed",message: 'broken' }); //if existingUser inValid do auto logout;
        }
        const metaData = await AuthModel.findById(existingUser._id);
        if (metaData && metaData.forgotPassword) {
            metaData.forgotPassword = undefined;
            await metaData.save();
        }
        async function isUserAuthRT() {
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
        const isUserAuthRTMatch = await isUserAuthRT()
        console.log(isUserAuthRTMatch);
        if (isUserAuthRTMatch) {
            const authFind = await AuthModel.findOne(
                { _id: extractRFT.id, "loggedin._id": extractRFT.id2 },
                { loggedin: { $elemMatch: { _id: extractRFT.id2 } } }
            );
            const result = authFind?.loggedin[0]
            const mAccessToken = genJwtToken({ id: existingUser._id, id2: result._id })
            if (result.refreshToken === isRefreshToken) {
                if (!isJWTExpired(isRefreshToken, process.env.REFRESH_TOKEN_SECRET_KEY).status) {
                    if (isJWTExpired(result.accessToken).status) {
                        await AuthModel.updateOne(
                            { _id: existingUser._id, 'loggedin._id': result._id },
                            { $set: { 'loggedin.$.accessToken': mAccessToken } }
                        );
                        return res.status(200).json({ status: "success", AccessToken: mAccessToken });
                    }
                    return res.status(200).json({ status: true, accesstoken: result.accessToken }); 

                } else {
                    const mRefreshToken = genJwtToken({ id: existingUser._id, id2: result._id },
                        process.env.REFRESH_TOKEN_SECRET_KEY,
                        process.env.JWT_REFRESH_TOKEN_LIFE
                    );
                    await AuthModel.updateOne(
                        { _id: existingUser._id, 'loggedin._id': result._id },
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
                    return res.status(200).json({ status: true,accesstoken: mAccessToken });
                }
            }
        }
        const mongoId = req.genMongooseid
        const newAccessToken = genJwtToken({ id: existingUser._id, id2: mongoId })
        const newRefreshToken = genJwtToken({ id: existingUser._id, id2: mongoId },
            process.env.REFRESH_TOKEN_SECRET_KEY,
            process.env.JWT_REFRESH_TOKEN_LIFE
        );
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
        return res.status(200).json({ status: "success", accesstoken : newAccessToken });
    } catch (error) {
        console.log({ [error.name]: error.message });
        res.status(500).json({ status: "failed", message: `Server ${error}` }); //if existingUser inValid do auto logout;
    }
};
export const logout = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        const extractTokenRT = jwtDecoder(refreshToken)
        const metaData = await AuthModel.findById(extractTokenRT.id);
        if (metaData && metaData.forgotPassword) {
            metaData.forgotPassword = undefined;
            await metaData.save();
        }
       await AuthModel.findOneAndUpdate(
            {_id:extractTokenRT.id},
            {$pull:{loggedin:{_id:extractTokenRT.id2}}},
            {new:true}
        );
        res.status(200).json({ status: "success", message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ status: "failed", message: 'Server error' });
    }
};
export const logoutAll = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        const extractTokenRT = jwtDecoder(refreshToken)
        const metaData = await AuthModel.findById(extractTokenRT.id);
        if (metaData && metaData.forgotPassword) {
            metaData.forgotPassword = undefined;
            await metaData.save();
        }
        metaData.loggedin = new Array();
        await metaData.save();
        res.status(200).json({ status: "success", message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ status: "failed", message: 'Server error' });
    }
};

