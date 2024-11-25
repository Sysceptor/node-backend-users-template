import express from 'express';
import multer from "multer"
import { auth } from '../middleware/auth.js';
import { userAgentMiddleware,generateMongooseId } from '../middleware/custom.js';

import {
    signup,
    verifyEmail,
    login,
    forgotPassword,
    // resetPassword,
    forgotPasswordVerification,
    refreshToken
} from '../controllers/authController.js';

const router = express.Router();
router.use(multer().array());
router.use(userAgentMiddleware);

// Auth Routes
router.post('/signup',signup);
router.get('/verify/:token', verifyEmail);
router.post('/login',generateMongooseId, login);
router.post('/forgotpassword', forgotPassword);
router.post('/forgotpassword/:token', forgotPasswordVerification);
// router.post('/reset-password',/*auth,*/ resetPassword);
router.post('/refresh-token',auth, refreshToken);

export default router;
