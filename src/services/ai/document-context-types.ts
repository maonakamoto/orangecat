export interface DocumentContext {
  id: string;
  title: string;
  content: string;
  document_type: string;
  visibility: string;
}

export interface ProfileContext {
  username?: string;
  name?: string;
  bio?: string;
  location_city?: string;
  location_country?: string;
  background?: string;
  website?: string;
}

export interface EntitySummary {
  id: string;
  type: string;
  title: string;
  description?: string;
  status: string;
  price_btc?: number;
  category?: string;
  location?: string;
  /** BTC received/raised for this entity (projects, causes, research) */
  raised_btc?: number;
  /** Number of unique supporters/contributors */
  num_supporters?: number;
}

export interface TaskSummary {
  id: string;
  title: string;
  category: string;
  priority: string;
  current_status: string;
  task_type: string;
  schedule_human?: string | null;
  /** ISO timestamp — present on one-time tasks/reminders with a deadline */
  due_date?: string | null;
  /** True if this task was created by the Cat as a reminder (vs a team task) */
  is_reminder?: boolean;
}

export interface WalletSummary {
  label: string;
  description: string | null;
  category: string;
  behavior_type: string;
  goal_amount: number | null;
  goal_currency: string | null;
  goal_deadline: string | null;
  budget_amount: number | null;
  budget_period: string | null;
  is_primary: boolean;
  /** Whether this wallet has a Nostr Wallet Connect URI configured (can auto-send payments) */
  has_nwc: boolean;
  /** Lightning address for receiving payments, if configured */
  lightning_address: string | null;
}

export interface PaymentCapabilities {
  /** User has at least one wallet with NWC configured — required for send_payment / fund_project actions */
  hasNwcWallet: boolean;
  /** User's primary lightning address (for display / recipient lookup) */
  lightningAddress: string | null;
}

export interface ConversationSummary {
  /** Conversation UUID — use as conversation_id in reply_to_message exec_action */
  id: string;
  /** @username of the other person (null for group chats) */
  other_username: string | null;
  /** Display name of the other person */
  other_name: string | null;
  /** Last message preview (truncated) */
  last_message_preview: string | null;
  /** True if the user sent the last message; false if they received it */
  last_message_is_mine: boolean;
  /** ISO timestamp of last message */
  last_message_at: string | null;
  /** True if there is at least one message the user hasn't read yet */
  has_unread: boolean;
}

/** A completed or recent sale (order where the user is the seller) */
export interface SaleRecord {
  entity_title: string;
  entity_type: string;
  amount_btc: number;
  status: string;
  created_at: string;
}

/** A group the user is a member of (not necessarily the creator) */
export interface GroupMembershipSummary {
  id: string;
  name: string;
  description: string | null;
  label: string;
  role: 'founder' | 'admin' | 'member';
  visibility: 'public' | 'members_only' | 'private';
}

/** An upcoming booking where the user is the service/asset provider */
export interface BookingRecord {
  starts_at: string;
  ends_at: string | null;
  status: string;
  customer_display_name: string | null;
  customer_username: string | null;
}

export interface InboundActivity {
  recentSales: SaleRecord[];
  upcomingBookings: BookingRecord[];
}

export interface FullUserContext {
  profile: ProfileContext | null;
  documents: DocumentContext[];
  entities: EntitySummary[];
  tasks: TaskSummary[];
  wallets: WalletSummary[];
  conversations: ConversationSummary[];
  inboundActivity: InboundActivity;
  memberGroups: GroupMembershipSummary[];
  paymentCapabilities: PaymentCapabilities;
  stats: {
    totalProducts: number;
    totalServices: number;
    totalProjects: number;
    totalCauses: number;
    totalEvents: number;
    totalAssets: number;
    totalLoans: number;
    totalInvestments: number;
    totalResearch: number;
    totalWishlists: number;
    totalTasks: number;
    urgentTasks: number;
    totalWallets: number;
  };
}
