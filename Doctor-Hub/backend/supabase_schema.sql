-- Run this in your Supabase SQL Editor to create the required tables

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    image TEXT,
    phone TEXT DEFAULT '000000000',
    address JSONB DEFAULT '{"line1": "", "line2": ""}',
    gender TEXT DEFAULT 'Not Selected',
    dob TEXT DEFAULT 'Not Selected',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Doctors table
CREATE TABLE IF NOT EXISTS doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    image TEXT NOT NULL,
    speciality TEXT NOT NULL,
    degree TEXT NOT NULL,
    experience TEXT NOT NULL,
    about TEXT NOT NULL,
    available BOOLEAN DEFAULT TRUE,
    fees NUMERIC NOT NULL,
    slots_booked JSONB DEFAULT '{}',
    address JSONB NOT NULL,
    date BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doc_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    slot_date TEXT NOT NULL,
    slot_time TEXT NOT NULL,
    user_data JSONB NOT NULL,
    doc_data JSONB NOT NULL,
    amount NUMERIC NOT NULL,
    date BIGINT NOT NULL,
    cancelled BOOLEAN DEFAULT FALSE,
    payment BOOLEAN DEFAULT FALSE,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
