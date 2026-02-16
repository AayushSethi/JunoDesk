
import express from 'express';
import * as authController from '../controllers/authController.js';
import * as assistantController from '../controllers/assistantController.js';
import * as callController from '../controllers/callController.js';
import * as toolsController from '../controllers/toolsController.js';
import * as voiceController from '../controllers/voiceController.js';
import * as scrapeController from '../controllers/scrapeController.js';
import * as subscriptionController from '../controllers/subscriptionController.js';

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
