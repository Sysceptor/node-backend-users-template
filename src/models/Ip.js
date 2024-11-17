import mongoose from "mongoose";
import DB from "../config/db.js";

// Define the schema for each IP entry without an _id field
const ipEntrySchema = new mongoose.Schema({
    address: {
        type: String, 
        required: true,
        trim: true, 
        unique: true,
    },
    region: {
        type: String,
        required: true,
        trim: true,
    },
    country: {
        type: String,
        required: true,
        trim: true,
    },
    timezone: {
        type: String,
        required: true,
        trim: true,
    },
    org: {
        type: String,
        required: true,
        trim: true,
    },
    createdat: {
        type: Date, // Date when the IP address was recorded
        default: Date.now,
        required: true,
    },
}, { _id: false }); // Disable _id for the subdocument

// Main schema
const ipSchema = new mongoose.Schema({
    userid: {
        type: String,
        required: true,
    },
    ip: [ipEntrySchema], // Use the subdocument schema without _id
});

let IpModel = DB.MDB.model('ip_address', ipSchema);
export default IpModel;
