// Shared TypeScript types for fidelity-app and backend
// Note: "Restaurant" naming is kept for DB/API backwards compatibility but represents any merchant type

export type LoyaltyType = 'stamps' | 'points';

export interface Restaurant {
  id: string;
  name: string;
  description?: string;
  color_primary: string;
  color_secondary: string;
  logo_emoji: string;
  loyalty_type: LoyaltyType;
  stamp_goal: number;
  points_per_visit: number;
  vapid_public_key?: string;
  vapid_private_key?: string;
  created_at: string;
}

export interface Customer {
  id: string;
  restaurant_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  stamps: number;
  points: number;
  discount_pct: number;
  total_visits: number;
  push_subscription?: string;
  gdpr_consent: boolean;
  marketing_consent: boolean;
  created_at: string;
}

export interface Pass {
  id: string;
  customer_id: string;
  serial_number: string;
  auth_token: string;
  pass_type_id: string;
  last_updated: string;
}

export type NotificationType = 'menu' | 'offer' | 'event' | 'general';
export type NotificationStatus = 'draft' | 'scheduled' | 'sent' | 'failed';

export interface Notification {
  id: string;
  restaurant_id: string;
  title: string;
  body: string;
  type: NotificationType;
  scheduled_at?: string;
  sent_at?: string;
  recipients_count: number;
  status: NotificationStatus;
  created_at: string;
}

export type StampAction = 'stamp_added' | 'reward_claimed' | 'points_added';

export interface StampHistory {
  id: string;
  customer_id: string;
  action: StampAction;
  value: number;
  note?: string;
  created_at: string;
}

export interface GdprLog {
  id: string;
  customer_id: string;
  action: string;
  performed_by: string;
  created_at: string;
}

export interface Stats {
  total_customers: number;
  active_customers: number;
  stamps_given_today: number;
  stamps_given_week: number;
  notifications_sent_total: number;
  new_customers_per_day: { date: string; count: number }[];
  top_customers: TopCustomer[];
}

export interface TopCustomer {
  id: string;
  first_name: string;
  last_name: string;
  total_visits: number;
  points: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}
