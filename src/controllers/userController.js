import userModel from "../models/Users.js"

export async function usersDetails(req, res) {
  try {
    const userData = await userModel.find().select('email role username -_id');
    const count = await userModel.countDocuments({}, { hint: "_id_" });
    if (count === 0) res.status(404).json({ message: 'no record found' });
    res.status(200).json({
      totalusers: count,
      userdetails: userData,
      ip: req.ip,
      status: "success"
    });
  } catch (e) {
    res.status(500).json({ status: "failed", message: 'Server error' });
  }
};

export async function userDetail(req, res) {
  const { username } = req.body;
  try {
    const data = await userModel.findOne({ username }).select('email role username -_id');
    if (!data) return res.status(404).json({ message: `${username} - no active record found` });
    return res.status(200).json({ data, ip: req.ip, status: "success" });
  } catch (error) {
    res.status(500).json({ status: "failed", message: `Server error ${error.message}` });
  };
};

export async function makeAdmin(req, res) {
  const { username } = req.body;
  try {
    const data = await userModel.findOne({ username });
    const dataBanned = await userModel.findOne({ username, deleted: true });
    const userWithAdmin = await userModel.findOne({ username, role: "admin" });

    if (userWithAdmin) return res.status(409).json({ status: "failed", message: `${username} is already admin` })
    if (!data) return res.status(404).json({ status: "failed", message: `${username} - no active record found` });
    if (dataBanned) return res.status(403).json({ status: "failed", message: `${username} - has been banned` });

    await userModel.updateOne({ username }, { $set: { role: "admin" } });
    return res.status(200).json({ status: "success", message: `user ${username} roled to admin` });

  } catch (error) {
    res.status(500).json({ status: "failed", message: `Server error ${error.message}` });
  }
}

export async function banUser(req, res) {
  const { username } = req.params;
  try {
    const data = await userModel.findOne({ username, deleted: false });
    const banneddata = await userModel.findOne({ username, deleted: true });
    if (data) {
      await userModel.updateOne({ username }, { $set: { deleted: true } });
      return res.status(200).json({  status:"success",message: `${username} is banned` });
    }

    if (banneddata) {
      return res.status(200).json({  status:"success",message: `${username} is already banned` });
    }
    return res.status(404).json({  status:"failed",message: `${username} - no active record found` });
  } catch (e) {
    console.error(`Error banning user ${username}:`, e);
    return res.status(500).json({  status:"failed",message: 'Server error' });
  }
}

export async function unbanUser(req, res) {
  const { username } = req.params;
  try {
    const banneddata = await userModel.findOne({ username, deleted: true });
    const data = await userModel.findOne({ username, deleted: false });
    if (banneddata) {
      await userModel.updateOne({ username }, { $set: { deleted: false } });
      return res.status(200).json({  status:"success",message: `${username} is unbanned` });
    }
    if (data) {
      return res.status(200).json({  status:"success",message: `${username} is already unbanned` });
    }
    return res.status(404).json({  status:"failed",message: `${username} - no active record found` });
  } catch (e) {
    console.error(`Error banning user ${username}:`, e);
    return res.status(500).json({  status:"success",message: `Server error ${error.message}` });
  }
}