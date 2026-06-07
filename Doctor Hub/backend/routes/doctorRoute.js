import express from 'express';
import { loginDoctor, appointmentsDoctor, appointmentCancel, doctorList,  appointmentComplete, doctorDashboard, doctorProfile, updateDoctorProfile, changeAvailability } from '../controllers/doctorController.js';
import { getMySchedule, saveMySchedule } from '../src/controllers/scheduleController.js';
import doctorPortalRoutes from '../src/routes/doctorPortal.js';
import authDoctor from '../middlewares/authDoctor.js';
const doctorRouter = express.Router();

/** Module — prompt-aligned doctor APIs (profile, clinics, schedule, patients) */
doctorRouter.use(doctorPortalRoutes);

doctorRouter.post("/login", loginDoctor)
doctorRouter.post("/cancel-appointment", authDoctor, appointmentCancel)
doctorRouter.get("/appointments", authDoctor, appointmentsDoctor)
doctorRouter.get("/list", doctorList)
doctorRouter.post("/change-availability", authDoctor, changeAvailability)
doctorRouter.post("/complete-appointment", authDoctor, appointmentComplete)
doctorRouter.get("/dashboard", authDoctor, doctorDashboard)
doctorRouter.get("/profile", authDoctor, doctorProfile)
doctorRouter.post("/update-profile", authDoctor, updateDoctorProfile)
doctorRouter.get("/schedule", authDoctor, getMySchedule)
doctorRouter.post("/schedule", authDoctor, saveMySchedule)

export default doctorRouter;