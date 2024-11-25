import mongoose from "mongoose";
import useragent from 'express-useragent';

export const generateMongooseId = (req, res, next) => {
    try {
        const gen_id = new mongoose.Types.ObjectId();
        req.genMongooseid = gen_id;
        next();
    } catch (error) {
        console.error("Error generating product ID:", error);
        res.status(500).json({ status: "failed", message: "Failed to generate product ID" });
        next(error);
    }
};
export function userAgentMiddleware(req,res, next) {
    try {
        const uAgent = useragent.parse(req.headers['user-agent']);
        let result = {};
        for (let [key, value] of Object.entries(uAgent)) {
            if (value === true || ["os", "browser", "version", "platform", "source"].includes(key)) {
                result[key] = value;
            }
        }
        result["ip"] = req.ip
        req.useragent = result;
        next();
    } catch (error) {
        console.log(error);
    };
};