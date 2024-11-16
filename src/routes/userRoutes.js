import express from 'express';
import multer from 'multer';

import { 
    usersDetails,
    banUser,
    unbanUser,
    userDetail,
    makeAdmin,
} from "../controllers/userController.js";
import { auth } from '../middleware/auth.js';

const router = express.Router();
router.use(multer().array());
router.use(auth);

router.get("",usersDetails); 
router.post('',userDetail);
router.post('/admin',makeAdmin);
router.get("/ban/:username",banUser);
router.get("/unban/:username",unbanUser);


export default router;