import express from 'express';
import multer from "multer"
import { auth } from '../middleware/auth.js';

import {
    signup,
    verifyEmail,
    login,
    requestPasswordReset,
    resetPassword,
    refreshToken
} from '../controllers/authController.js';

const router = express.Router();
router.use(multer().array());

// Auth Routes
router.post('/signup',signup);
router.get('/verify/:token', verifyEmail);
router.post('/login', login);
router.post('/request-password-reset', requestPasswordReset);
router.post('/reset-password', resetPassword);
router.post('/refresh-token',auth, refreshToken);

export default router;
