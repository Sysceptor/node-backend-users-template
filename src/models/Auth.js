import mongoose from "mongoose";
import DB from "../config/db.js"

const metaData = new mongoose.Schema({
    metadata: { type: Map, of: String},
    refreshToken: { type: String },
    accessToken: { type: String },
});

const authSchema = new mongoose.Schema({
    _id: { type: mongoose.Schema.Types.ObjectId,  ref: 'User'},
    signedup:{type: Map, of: String},
    loggedin: [metaData],
    verificationToken: { type: String },
    forgotPassword : {type:String},
    resetPassword : {type:String},
}, { timestamps: true });

const AuthModel = DB.MDB.model("auth", authSchema);
export default AuthModel;