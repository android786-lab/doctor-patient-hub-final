# CareLink - Doctor Appointment Web App

CareLink is a full-stack web application that simplifies booking doctor appointments. It supports three roles: **Patient**, **Doctor**, and **Admin**, with Stripe payment integration and image uploads via Cloudinary.

## Tech Stack

- **Frontend**: React.js, Tailwind CSS, Vite
- **Admin Panel**: React.js, Tailwind CSS, Vite
- **Backend**: Node.js, Express.js
- **Database**: Supabase (PostgreSQL)
- **Storage**: Cloudinary (doctor/user images)
- **Payment**: Stripe Checkout
- **Auth**: JWT (jsonwebtoken) + bcrypt

## Project Structure

```
CareLink/
├── frontend/        # Patient-facing React app
├── admin/           # Admin & Doctor React app
└── backend/         # Express.js API server
```

## Features

### Patient
- Register / Login
- Browse and filter doctors by speciality
- Book appointment slots
- Pay online via Stripe Checkout
- View and cancel appointments
- Edit profile (name, phone, address, gender, DOB, photo)

### Doctor
- Login to doctor dashboard
- View appointments, earnings, patient count
- Mark appointments complete or cancel them
- Update profile (fees, address, about, availability)

### Admin
- Login with hardcoded credentials
- Add doctors (with Cloudinary image upload)
- View all doctors, toggle availability
- View all appointments, cancel any
- Dashboard with total doctors, patients, appointments

## Environment Variables

### `backend/.env`
```
SUPABASE_URL=
SUPABASE_KEY=
CLOUDINARY_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_SECRET_KEY=
JWT_SECRET=
ADMIN_EMAIL=
ADMIN_PASSWORD=
STRIPE_SECRET_KEY=
FRONTEND_URL=
CURRENCY=USD
PORT=5000
```

### `frontend/.env`
```
VITE_BACKEND_URL=
VITE_ADMIN_URL=
VITE_STRIPE_PUBLISHABLE_KEY=
```

### `admin/.env`
```
VITE_BACKEND_URL=
VITE_FRONTEND_URL=
VITE_CURRENCY=USD
```

## Database (Supabase)

Run `backend/supabase_schema.sql` in your Supabase SQL Editor to create the required tables:

- `users` — patient accounts
- `doctors` — doctor profiles with slots
- `appointments` — booking records with JSONB user/doc snapshots

## Running Locally

```bash
# Backend
cd backend
npm install
node server.js

# Frontend
cd frontend
npm install
npm run dev

# Admin
cd admin
npm install
npm run dev
```

## Deployment

All three apps are deployed separately on Vercel. The backend requires a `vercel.json` (included) and all environment variables must be set in the Vercel dashboard — `.env` files are not used in production.

Make sure `FRONTEND_URL` in the backend matches the deployed frontend URL for Stripe redirect to work correctly.
## Project URL

https://fa-23-bse-081-hamza-6-b-y5xy.vercel.app/
## Credentials For Login 
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="adminpassword"
USER_EMAIL="haiderwahla199@gmail.com"
USER_PASSWORD="12345678"
DOCTOR_EMAIL="haiderraza199@gmail.com"
DOCTOR_PASSWORD="12341234"

## Screenshots
![Screenshot 2026-04-05 225308](https://github.com/user-attachments/assets/672d8ce4-579d-49f3-916a-43ed15b8cf70)![Screenshot 2026-04-05 225340](https://github.com/user-attachments/assets/446b6b91-df67-4965-8fb9-f877b7988599)![Screenshot 2026-04-05 225322](https://github.com/user-attachments/assets/56824911-614f-479c-87cb-8c815bb3a928)
![Screenshot 2026-04-05 225247](https://github.com/user-attachments/assets/983e366d-28e3-47c7-8192-a256da467297)![Screenshot 2026-04-05 225432](https://github.com/user-attachments/assets/a4a5b91e-d5a6-45b9-b847-f01352e84ab5)![Screenshot 2026-04-05 225451](https://github.com/user-attachments/assets/1c6c71bb-6753-453b-ac7d-04d6060ef55c)![Screenshot 2026-04-05 225920 (1)](https://github.com/user-attachments/assets/a1490d59-0196-44ae-8b91-56e67e2ae1a4)








