
import express from 'express';
import * as authController from '../controllers/authController.js';
import * as assistantController from '../controllers/assistantController.js';
import * as callController from '../controllers/callController.js';
import * as toolsController from '../controllers/toolsController.js';
import * as voiceController from '../controllers/voiceController.js';
import * as scrapeController from '../controllers/scrapeController.js';
import * as subscriptionController from '../controllers/subscriptionController.js';
import * as messageController from '../controllers/messageController.js';
import * as chatController from '../controllers/chatController.js';

const router = express.Router();

// --- Health Check ---
router.get('/', (req, res) => res.send('AI Receptionist Brain is Active 🧠'));

// --- Auth Routes ---
router.post('/api/dev-signup', authController.devSignup);
router.post('/api/auth/google-url', authController.googleAuthUrl);
router.get('/auth/google/callback', authController.googleAuthCallback);

// --- Assistant Routes ---
router.post('/api/provision', assistantController.provision);
router.post('/api/sync-assistant', assistantController.syncAssistant);
router.get('/api/fix-assistant-link', assistantController.fixAssistantLink);

// Allow GET or POST for cron to make it easier to trigger
router.all('/api/cron/refresh-all', assistantController.refreshAllAssistants);

// --- Call Routes ---
router.get('/api/calls', callController.getCalls);
router.get('/api/sync-calls', callController.syncCalls);
router.post('/api/webhook/vapi', callController.vapiWebhook);
router.post('/api/test-call', callController.initiateTestCall);
router.get('/api/test-call/status', callController.getTestCallStatus);

// --- Message Routes ---
router.post('/api/webhook/twilio-sms', messageController.twilioSmsWebhook);
router.get('/api/messages', messageController.getMessages);
router.post('/api/messages/send', messageController.sendManualMessage);

// --- Chat Routes ---
router.get('/api/chats', chatController.getChats);
router.post('/api/chats/send', chatController.sendChatMessage);
router.post('/api/chats/create-vapi', chatController.createVapiChat);

// --- Tool Routes ---
router.post('/api/tools/check-availability', toolsController.checkAvailability);
router.post('/api/tools/book-appointment', toolsController.bookAppointment);
router.post('/api/tools/get-current-time', toolsController.getCurrentTime);

// --- Voice Routes ---
router.get('/api/voices', voiceController.getVoices);

// --- Utility Routes ---
router.post('/api/scrape-website', scrapeController.scrapeWebsite);

// --- Subscription Routes ---
router.post('/api/verify-receipt', subscriptionController.verifyReceipt);
router.get('/api/subscription-status', subscriptionController.getSubscriptionStatus);

export default router;
