import IpModel from "../models/Ip.js";

// Function to log IP into a user's IP address array
const logIpForUser = async (userid, ipData) => {
  try {
    const existingIpAddress = await IpModel.findOne({userid,"ip.address":ipData.address});   
    if(!existingIpAddress){
       await IpModel.findOneAndUpdate(
      { userid }, // Find by userid
      { 
        $push: { ip: ipData } // Push the new IP data into the 'ip' array
      },
      { upsert: true, new: true } // upsert: create a new document if not found, new: return the updated document
    );
    console.log("IP log successfully updated.");
    return;
    }
   
    console.log("IP already exist")

  } catch (error) {
    console.error("Error updating IP log:", error);
  }
};

export {logIpForUser}