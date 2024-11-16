import express from 'express';
import multer from 'multer';
import { auth } from '../middleware/auth.js';

import { addAddress,pincode } from '../controllers/addressController.js';

const router = express.Router();

router.use(auth);

router.post("",multer().array(),addAddress);
router.get("/:pincode",multer().array(),pincode);

export default router;