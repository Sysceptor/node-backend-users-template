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
    refreshToken,
    logoutAll,
    logout
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
router.post('/refreshtoken',/*auth,*/ refreshToken);
router.get('/logoutall',/*auth,*/logoutAll);
router.get('/logout',/*auth,*/logout);

export default router;
