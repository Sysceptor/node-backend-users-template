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
      required: true,
      trim: true, 
    },
    pincode: {
      type: String, 
      required: true,
      trim: true, 
    },
    district:{
      type:String,
      required:true,
      trim:true
    },
    city:{
      type:String,
      required:true,
      trim:true
    },
    state:{
      type:String,
      required:true,
      trim:true
    },
    country:{
      type:String,
      required:true,
      trim:true
    },
  }
});

// Create a Mongoose model
const AddressModel = DB.MDB.model("Address", addressSchema);
export default AddressModel;
