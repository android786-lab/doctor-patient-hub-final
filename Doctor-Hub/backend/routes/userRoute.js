// DEPRECATED — use /api/auth/*, /api/patient/*, /api/appointments/*, /api/payments/* instead.
import express from 'express';
import { bookAppointment, cancelAppointment, getProfile, listAppointment, loginUser, paymentSTRIPE, registerUser, updateProfile, verifySTRIPE } from '../controllers/userController.js';
import { paymentManual } from '../src/controllers/manualPaymentController.js';
import authUser from '../middlewares/authUser.js';
import upload from '../middlewares/multer.js';
import memoryUpload from '../middlewares/multerMemory.js';

const userRouter = express.Router();

userRouter.post("/register", registerUser)
userRouter.post("/login", loginUser)
userRouter.get("/get-profile", authUser, getProfile)
userRouter.post("/update-profile", upload.single('image'), authUser, updateProfile)
userRouter.post("/book-appointment", authUser, bookAppointment)
userRouter.get("/appointments", authUser, listAppointment)
userRouter.post("/cancel-appointment", authUser, cancelAppointment)
userRouter.post("/payment-STRIPE", authUser, paymentSTRIPE)
userRouter.post("/payment-manual", memoryUpload.single('screenshot'), authUser, paymentManual)
userRouter.post("/verifySTRIPE", authUser, verifySTRIPE)


 




export default userRouter;