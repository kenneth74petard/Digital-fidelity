import webpush from 'web-push';
import { getDb } from '../db/schema';

// TODO [PRODUCTION]: For iOS Wallet push notifications, use APNs (Apple Push Notification service)
// instead of Web Push. Web Push works for PWA/browser, APNs for native iOS Wallet updates.

let vapidInitialized = false;

export function initVapid(publicKey: string, privateKey: string, email: string): void {
  webpush.setVapidDetails(`mailto:${email}`, publicKey, privateKey);
  vapidInitialized = true;
}

/**
 * Send push notification to a single subscriber
 * In non-live mode, logs to console instead of sending
 */
export async function sendPushToSubscription(
  subscription: webpush.PushSubscription,
  title: string,
  body: string,
  restaurantName: string
): Promise<boolean> {
  const pushLiveMode = process.env.PUSH_LIVE_MODE === 'true';

  const payload = JSON.stringify({
    title,
    body,
    icon: '/icon.png',
    badge: '/badge.png',
    data: { restaurantName },
  });

  if (!pushLiveMode) {
    console.log(`[PUSH_DRY_RUN] Push notification queued for preview:`);
    console.log(`  Title: ${title}`);
    console.log(`  Body: ${body}`);
    console.log(`  Recipient endpoint: ${subscription.endpoint?.substring(0, 50)}...`);
    return true;
  }

  try {
    await webpush.sendNotification(subscription, payload);
    return true;
  } catch (error) {
    console.error('Push notification error:', error);
    return false;
  }
}

/**
 * Send notification to all marketing-consented customers of a commerce
 * Returns count of successful sends
 */
export async function sendToAllCustomers(
  restaurantId: string,
  title: string,
  body: string,
  restaurantName: string
): Promise<number> {
  const db = getDb();
  const pushLiveMode = process.env.PUSH_LIVE_MODE === 'true';

  // Get all customers with marketing consent and push subscription
  const customers = db.prepare(`
    SELECT id, first_name, last_name, push_subscription
    FROM customers
    WHERE restaurant_id = ? AND marketing_consent = 1
  `).all(restaurantId) as Array<{
    id: string;
    first_name: string;
    last_name: string;
    push_subscription: string | null;
  }>;

  const eligibleCount = customers.length;

  if (!pushLiveMode) {
    console.log(`[PUSH_DRY_RUN] Notification preview for ${eligibleCount} customers:`);
    console.log(`  Title: "${title}"`);
    console.log(`  Body: "${body}"`);
    for (const c of customers) {
      console.log(`  → ${c.first_name} ${c.last_name} (${c.id})`);
    }
    return eligibleCount;
  }

  let successCount = 0;
  for (const customer of customers) {
    if (!customer.push_subscription) continue;
    try {
      const subscription = JSON.parse(customer.push_subscription) as webpush.PushSubscription;
      const success = await sendPushToSubscription(subscription, title, body, restaurantName);
      if (success) successCount++;
    } catch (err) {
      console.error(`Failed to send to customer ${customer.id}:`, err);
    }
  }

  return successCount;
}
