import { supabase } from '../config/supabase.js';
import fetch from 'node-fetch';

const APPLE_VERIFY_RECEIPT_URL_PRODUCTION = 'https://buy.itunes.apple.com/verifyReceipt';
const APPLE_VERIFY_RECEIPT_URL_SANDBOX = 'https://sandbox.itunes.apple.com/verifyReceipt';

export const verifyReceipt = async (req, res) => {
    const { receiptData, userId } = req.body;

    if (!receiptData || !userId) {
        return res.status(400).json({ error: 'Missing receiptData or userId' });
    }

    try {
        let verifyResponse = await fetch(APPLE_VERIFY_RECEIPT_URL_PRODUCTION, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                'receipt-data': receiptData,
                'password': process.env.APPLE_SHARED_SECRET,
                'exclude-old-transactions': true
            })
        });

        let result = await verifyResponse.json();

        if (result.status === 21007) {
            verifyResponse = await fetch(APPLE_VERIFY_RECEIPT_URL_SANDBOX, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    'receipt-data': receiptData,
                    'password': process.env.APPLE_SHARED_SECRET,
                    'exclude-old-transactions': true
                })
            });
            result = await verifyResponse.json();
        }

        if (result.status !== 0) {
            console.error('Apple receipt verification failed:', result);
            return res.status(400).json({ error: 'Invalid receipt', details: result });
        }

        const latestReceipt = result.latest_receipt_info?.[0] || result.receipt?.in_app?.[0];
        
        if (!latestReceipt) {
            return res.status(400).json({ error: 'No transaction found in receipt' });
        }

        const expiresDate = latestReceipt.expires_date_ms 
            ? new Date(parseInt(latestReceipt.expires_date_ms))
            : null;
        
        const purchaseDate = new Date(parseInt(latestReceipt.purchase_date_ms));
        
        const status = expiresDate && expiresDate > new Date() ? 'active' : 'expired';

        const subscriptionData = {
            user_id: userId,
            product_id: latestReceipt.product_id,
            original_transaction_id: latestReceipt.original_transaction_id,
            latest_transaction_id: latestReceipt.transaction_id,
            status: status,
            expires_at: expiresDate?.toISOString(),
            purchase_date: purchaseDate.toISOString(),
            cancellation_reason: latestReceipt.cancellation_reason || null,
            raw_receipt: result,
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('ios_subscriptions')
            .upsert(subscriptionData, {
                onConflict: 'original_transaction_id'
            })
            .select()
            .single();

        if (error) {
            console.error('Supabase upsert error:', error);
            return res.status(500).json({ error: 'Database error', details: error });
        }

        console.log('✅ Subscription verified and saved:', data);

        res.json({
            success: true,
            subscription: {
                status: data.status,
                expiresAt: data.expires_at,
                productId: data.product_id
            }
        });

    } catch (err) {
        console.error('Receipt verification error:', err);
        res.status(500).json({ error: 'Verification failed', details: err.message });
    }
};

export const getSubscriptionStatus = async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'Missing userId' });
    }

    try {
        const { data, error } = await supabase
            .from('ios_subscriptions')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('Subscription fetch error:', error);
            return res.status(500).json({ error: 'Database error' });
        }

        if (!data) {
            return res.json({ hasActiveSubscription: false });
        }

        const isActive = data.expires_at && new Date(data.expires_at) > new Date();

        if (!isActive && data.status === 'active') {
            await supabase
                .from('ios_subscriptions')
                .update({ status: 'expired', updated_at: new Date().toISOString() })
                .eq('id', data.id);
        }

        res.json({
            hasActiveSubscription: isActive,
            subscription: isActive ? {
                productId: data.product_id,
                expiresAt: data.expires_at,
                status: data.status
            } : null
        });

    } catch (err) {
        console.error('Get subscription error:', err);
        res.status(500).json({ error: 'Failed to fetch subscription' });
    }
};
