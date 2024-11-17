import mongoose from "mongoose";
import DB from "../config/db.js";

// Define the Address Schema
const addressSchema = new mongoose.Schema({
  userid: {
    type: String, 
    required: true, 
    unique: true,
    trim: true, 
  },
  address: {
    line: {
      type: String, 
      lowercase: true, 
      required: true,
      trim: true, 
    },
    pincode: {
      lowercase: true, 
      type: String, 
      required: true,
      trim: true, 
    },
    district:{
      lowercase: true, 
      type:String,
      required:true,
      trim:true
    },
    city:{
      lowercase: true, 
      type:String,
      required:true,
      trim:true
    },
    state:{
      lowercase: true, 
      type:String,
      required:true,
      trim:true
      
    },
    country:{
      lowercase: true, 
      type:String,
      required:true,
      trim:true
    },
  }
});

// Create a Mongoose model
const AddressModel = DB.MDB.model("Address", addressSchema);
export default AddressModel;
