import AddressModel from "../models/Address.js";
import UserModel from "../models/Users.js";
import DB from '../config/db.js';

export async function addAddress(req, res) {
    const {
        username,
        address,
        pincode,
        district,
        city,
        state,
        country,
    } = req.body;
    try {
        const user = await UserModel.findOne({ username }).select("_id");
        if (!user) return res.status(422).json({
            status: "failed",
            message: "Unprocessable Entity"
        });

        const newAddress = new AddressModel({
            userid: user._id,
            address: {
                line: address,
                district,
                state,
                city,
                country,
                pincode
            }
        });
        await newAddress.save();
        res.status(201).json({ status: "success" });
    } catch (e) {
        res.status(500).json({ status: "failed", message: 'Server Error ' + e.message });
    }
}

export async function pincode(req, res) {
    const { pincode } = req.params;
    console.log(pincode)
    try {
        const pincodeDocs = await DB.DB1.collection('pincode_india').findOne({ pincode: 625604 }, { projection: { _id: 0, pincode: 1, district: 1, state: 1, country: 1, taluk: 1 } });
        if (pincode) return res.status(200).json({ data: pincodeDocs, status: "success" });
        res.status(404).json({ status: "failed", message: 'pincode does not exist' });
    } catch (e) {
        res.status(500).json({ status: "failed", message: 'Server error' });
    }
};