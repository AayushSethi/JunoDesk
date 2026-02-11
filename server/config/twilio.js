
import dotenv from 'dotenv';
import twilio from 'twilio';

dotenv.config();

export const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);
