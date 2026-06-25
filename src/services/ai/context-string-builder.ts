import type { DocumentContext, EntitySummary, FullUserContext } from './document-context-types';
import { ENTITY_STATUS } from '@/config/database-constants';

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  goals: 'Goals & Aspirations',
  skills: 'Skills & Expertise',
  finances: 'Financial Information',
  business_plan: 'Business Plans',
  background: 'Background & History',
  preferences: 'Preferences & Values',
  plans: 'Plans & Projects',
  notes: 'Notes & Ideas',
  other: 'Other Context',
};

function buildDocumentContextString(documents: DocumentContext[]): string {
  if (documents.length === 0) {
    return '';
  }

  const sections: string[] = [];

  const byType = documents.reduce(
    (acc, doc) => {
      const type = doc.document_type || 'other';
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(doc);
      return acc;
    },
    {} as Record<string, DocumentContext[]>
  );

  for (const [type, docs] of Object.entries(byType)) {
    const label = DOCUMENT_TYPE_LABELS[type] || type;
    const docContents = docs
      .map(doc => {
        const content =
          doc.content.length > 1500 ? doc.content.substring(0, 1500) + '...' : doc.content;
        return `**${doc.title}**:\n${content}`;
      })
      .join('\n\n');

    sections.push(`### ${label}\n${docContents}`);
  }

  return `## Personal Context (from user's My Context documents)

The user has shared the following context to help you provide personalized advice:

${sections.join('\n\n')}

---
Use this context to personalize your responses. Reference their goals, skills, and situation when relevant. If they ask about something related to their context, use this information.`;
}

export function buildFullContextString(context: FullUserContext): string {
  const sections: string[] = [];
  const locale = context.runtime?.locale || 'en-US';

  // Current session — what's true RIGHT NOW. Goes FIRST so Cat can scope everything
  // (price quotes, language, "the page you just came from") from the top.
  {
    const r = context.runtime;
    if (r) {
      const lines: string[] = [];
      if (r.currentActor) {
        const actorLabel =
          r.currentActor.type === 'individual'
            ? `**Acting as**: yourself${r.currentActor.name ? ` (${r.currentActor.name})` : ''}`
            : `**Acting as**: group "${r.currentActor.name ?? 'unnamed'}" (you have permission to act on this group's behalf)`;
        lines.push(actorLabel);
      }
      lines.push(
        `**Display currency**: ${r.preferredCurrency} — quote prices in this currency by default; convert to/from BTC as needed.`
      );
      if (r.btcRate) {
        lines.push(
          `**Live BTC price**: 1 BTC ≈ ${Math.round(r.btcRate.rate).toLocaleString('en-US')} ${r.btcRate.currency} right now — use THIS rate for every BTC⇄fiat conversion. Never recall or guess a rate.`
        );
      } else {
        lines.push(
          `**Live BTC price**: unavailable this turn — do NOT guess a BTC⇄fiat rate; say you can't quote an exact conversion right now.`
        );
      }
      lines.push(
        `**Locale**: ${r.locale} — reply in the language and conventions of this locale unless the user writes in another language.`
      );
      if (r.lastVisitedPath) {
        lines.push(
          `**Just came from**: \`${r.lastVisitedPath}\` — if relevant to their question, reference what's on that page.`
        );
      }
      sections.push(`## Current Session\n${lines.join('\n')}`);
    }
  }

  // Current date/time — injected so Cat can reason temporally about reminders,
  // deadlines, overdue tasks, and upcoming events. Formatted in the user's locale.
  {
    const now = new Date();
    const dateStr = now.toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    });
    const timeStr = now.toISOString().slice(11, 16);
    sections.push(`## Current Date & Time\nToday is ${dateStr}, ${timeStr} UTC.`);
  }

  // Profile section
  if (context.profile) {
    const p = context.profile;
    const profileParts: string[] = [];

    if (p.name) {
      profileParts.push(`**Name**: ${p.name}`);
    }
    if (p.username) {
      profileParts.push(`**Username**: @${p.username}`);
    }
    if (p.bio) {
      profileParts.push(`**Bio**: ${p.bio}`);
    }
    if (p.location_city || p.location_country) {
      profileParts.push(
        `**Location**: ${[p.location_city, p.location_country].filter(Boolean).join(', ')}`
      );
    }
    if (p.background) {
      profileParts.push(`**Background**: ${p.background}`);
    }
    if (p.website) {
      profileParts.push(`**Website**: ${p.website}`);
    }

    if (profileParts.length > 0) {
      sections.push(`## User Profile\n${profileParts.join('\n')}`);
    }
  }

  // Documents section
  if (context.documents.length > 0) {
    const docContextString = buildDocumentContextString(context.documents);
    if (docContextString) {
      sections.push(docContextString);
    }
  }

  // Entities section
  if (context.entities.length > 0) {
    const entityGroups: Record<string, EntitySummary[]> = {};
    context.entities.forEach(e => {
      if (!entityGroups[e.type]) {
        entityGroups[e.type] = [];
      }
      entityGroups[e.type].push(e);
    });

    const entityParts: string[] = [];

    const typeLabels: Record<string, string> = {
      product: 'Products',
      service: 'Services',
      project: 'Projects',
      cause: 'Causes',
      event: 'Events',
      asset: 'Assets',
      loan: 'Loans',
      investment: 'Investments',
      research: 'Research',
      wishlist: 'Wishlists',
    };

    for (const [type, items] of Object.entries(entityGroups)) {
      const label = typeLabels[type] || type;
      const itemList = items
        .map(item => {
          const parts = [`- **${item.title}**`];
          if (item.status !== ENTITY_STATUS.ACTIVE) {
            parts.push(` [${item.status}]`);
          }
          if (item.price_btc) {
            parts.push(` (${item.price_btc} BTC)`);
          }
          if (item.category) {
            parts.push(` [${item.category}]`);
          }
          if (item.location) {
            parts.push(` @ ${item.location}`);
          }
          // Show funding received where known (projects, research, causes)
          if (item.raised_btc !== undefined && item.raised_btc > 0) {
            const supporterNote = item.num_supporters
              ? ` from ${item.num_supporters} supporter${item.num_supporters !== 1 ? 's' : ''}`
              : '';
            parts.push(` — raised ${item.raised_btc} BTC${supporterNote}`);
          }
          if (item.description) {
            parts.push(`: ${item.description}`);
          }
          parts.push(` (id: ${item.id})`);
          return parts.join('');
        })
        .join('\n');
      entityParts.push(`### ${label}\n${itemList}`);
    }

    if (entityParts.length > 0) {
      sections.push(
        `## User's OrangeCat Entities\n\nThe user has created the following on OrangeCat:\n\n${entityParts.join('\n\n')}`
      );
    }
  }

  // Group memberships section — groups the user belongs to (not just groups they created)
  if (context.memberGroups.length > 0) {
    const groupLines = context.memberGroups.map(g => {
      const parts = [`- **${g.name}**`];
      if (g.label) {
        parts.push(` [${g.label}]`);
      }
      parts.push(` — role: ${g.role}`);
      if (g.visibility !== 'public') {
        parts.push(` (${g.visibility})`);
      }
      if (g.description) {
        parts.push(`: ${g.description.substring(0, 200)}`);
      }
      // Include group ID so Cat can reference it in invite_to_organization exec_action
      parts.push(` (id: ${g.id})`);
      return parts.join('');
    });
    sections.push(
      `## Group Memberships\nThe user is a member of the following groups:\n${groupLines.join('\n')}`
    );
  }

  // Social graph — follower/following counts + a few accounts they follow.
  {
    const sg = context.socialGraph;
    if (sg && (sg.followers > 0 || sg.following > 0)) {
      const lines = [`- ${sg.followers} follower(s), following ${sg.following} account(s)`];
      if (sg.recentFollowing.length > 0) {
        const handles = sg.recentFollowing
          .map(p => (p.username ? `@${p.username}` : p.name || 'unknown'))
          .join(', ');
        lines.push(`- Recently followed: ${handles}`);
      }
      sections.push(`## Social Graph\n${lines.join('\n')}`);
    }
  }

  // Tasks section
  if (context.tasks.length > 0) {
    const now = new Date();
    const urgent = context.tasks.filter(
      t => t.priority === 'urgent' || t.current_status === 'needs_attention'
    );
    const overdueReminders = context.tasks.filter(
      t => t.is_reminder && t.due_date && new Date(t.due_date) < now
    );
    const taskLines = context.tasks.map(t => {
      const parts = [`- **${t.title}**`];
      if (t.is_reminder) {
        parts.push(' [reminder]');
      } else {
        parts.push(` [${t.category}]`);
      }
      if (t.priority !== 'normal') {
        parts.push(` priority:${t.priority}`);
      }
      if (t.current_status !== 'idle') {
        parts.push(` status:${t.current_status}`);
      }
      if (t.due_date) {
        const due = new Date(t.due_date);
        const isOverdue = due < now;
        const dueStr =
          due.toLocaleString(locale, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'UTC',
            hour12: false,
          }) + ' UTC';
        parts.push(isOverdue ? ` ⚠️ OVERDUE (was due ${dueStr})` : ` — due ${dueStr}`);
      } else if (t.task_type !== 'one_time' && t.schedule_human) {
        parts.push(` — ${t.schedule_human}`);
      }
      // Always include task ID so Cat can reference it in complete_task exec_action
      parts.push(` [task_id: ${t.id}]`);
      return parts.join('');
    });
    const alerts: string[] = [];
    if (urgent.length > 0) {
      alerts.push(
        `⚠️ ${urgent.length} task${urgent.length > 1 ? 's' : ''} need${urgent.length === 1 ? 's' : ''} attention.`
      );
    }
    if (overdueReminders.length > 0) {
      alerts.push(
        `🔔 ${overdueReminders.length} reminder${overdueReminders.length > 1 ? 's are' : ' is'} overdue.`
      );
    }
    const alertNote = alerts.length > 0 ? `\n${alerts.join(' ')}` : '';
    sections.push(`## Active Tasks & Reminders${alertNote}\n${taskLines.join('\n')}`);
  }

  // Wallets section
  if (context.wallets.length > 0) {
    const walletLines = context.wallets.map(w => {
      const parts = [`- **${w.label}**`];
      parts.push(`(${w.category}`);
      // Last-synced on-chain balance. Cached (refreshed from the chain), not
      // real-time — so Cat can answer "how much do I have?" but should caveat
      // that it's the last synced figure rather than a live wallet balance.
      if (typeof w.balance_btc === 'number') {
        parts.push(`, balance: ${w.balance_btc} BTC`);
        if (w.balance_updated_at) {
          parts.push(` (synced ${w.balance_updated_at.slice(0, 10)})`);
        }
      }
      if (w.behavior_type === 'one_time_goal' && w.goal_amount) {
        parts.push(`, goal: ${w.goal_amount} ${w.goal_currency || 'BTC'}`);
        if (w.goal_deadline) {
          parts.push(` by ${w.goal_deadline}`);
        }
      }
      if (w.behavior_type === 'recurring_budget' && w.budget_amount) {
        parts.push(`, budget: ${w.budget_amount} BTC/${w.budget_period || 'month'}`);
      }
      parts.push(')');
      if (w.behavior_type !== 'general') {
        parts.push(` - ${w.behavior_type}`);
      }
      if (w.is_primary) {
        parts.push(' - primary wallet');
      }
      return parts.join('');
    });

    const totalBtc = context.wallets.reduce((sum, w) => sum + (w.balance_btc ?? 0), 0);
    const totalLine =
      totalBtc > 0
        ? `\n_Total last-synced balance across wallets: ${Number(totalBtc.toFixed(8))} BTC (cached on-chain figures, not real-time)._`
        : '';

    sections.push(`## User's Wallets\n${walletLines.join('\n')}${totalLine}`);
  }

  // Conversations section — gives Cat visibility into recent messages so it can help reply
  if (context.conversations.length > 0) {
    const unreadCount = context.conversations.filter(c => c.has_unread).length;
    const convLines = context.conversations.map(c => {
      const who = c.other_username ? `@${c.other_username}` : '(group chat)';
      const direction = c.last_message_is_mine ? 'you sent' : 'received';
      const preview = c.last_message_preview
        ? `: "${c.last_message_preview.substring(0, 80)}${c.last_message_preview.length > 80 ? '…' : ''}"`
        : '';
      const unreadBadge = c.has_unread ? ' 🔴 UNREAD' : '';
      return `- ${who}${unreadBadge}${preview} (${direction}) [conv id: ${c.id}]`;
    });
    const unreadNote =
      unreadCount > 0
        ? `\n📬 ${unreadCount} unread conversation${unreadCount > 1 ? 's' : ''} — proactively mention this to the user.`
        : '';
    sections.push(
      `## Recent Conversations${unreadNote}\nUse the conversation id with reply_to_message to reply on the user's behalf.\n${convLines.join('\n')}`
    );
  }

  // Inbound activity section — sales received and upcoming bookings as provider
  {
    const { recentSales, upcomingBookings } = context.inboundActivity;
    const parts: string[] = [];

    if (recentSales.length > 0) {
      const saleLines = recentSales.map(s => {
        const date = new Date(s.created_at).toLocaleDateString(locale, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          timeZone: 'UTC',
        });
        return `- **${s.entity_title}** (${s.entity_type}) — ${s.amount_btc} BTC — ${date}`;
      });
      parts.push(`### Recent Sales (paid)\n${saleLines.join('\n')}`);
    }

    if (upcomingBookings.length > 0) {
      const bookingLines = upcomingBookings.map(b => {
        const start = new Date(b.starts_at).toLocaleString(locale, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'UTC',
          hour12: false,
        });
        const who =
          b.customer_display_name ??
          (b.customer_username ? `@${b.customer_username}` : 'unknown customer');
        return `- ${start} UTC with ${who} [${b.status}]`;
      });
      parts.push(`### Upcoming Bookings (as provider)\n${bookingLines.join('\n')}`);
    }

    if (parts.length > 0) {
      sections.push(`## Inbound Economic Activity\n${parts.join('\n\n')}`);
    }
  }

  // Payment capabilities section — always include so Cat knows what actions are available
  {
    const { hasNwcWallet, lightningAddress } = context.paymentCapabilities;
    const capLines: string[] = [];
    if (hasNwcWallet) {
      capLines.push(
        '⚡ **NWC wallet connected** — can use send_payment and fund_project exec_action blocks to send Bitcoin automatically'
      );
    } else {
      capLines.push(
        '❌ **No NWC wallet** — cannot auto-send payments; if user asks to send Bitcoin, tell them to connect a Nostr Wallet Connect wallet first (Settings → Wallets)'
      );
    }
    if (lightningAddress) {
      capLines.push(`📬 **Lightning address**: ${lightningAddress} (others can pay the user here)`);
    } else {
      capLines.push(
        '📬 **No lightning address configured** — user cannot receive lightning payments without one'
      );
    }
    sections.push(`## Payment Capabilities\n${capLines.join('\n')}`);
  }

  // Stats summary
  const { stats } = context;
  const hasAnyEntities =
    stats.totalProducts +
      stats.totalServices +
      stats.totalProjects +
      stats.totalCauses +
      stats.totalEvents +
      stats.totalAssets +
      stats.totalLoans +
      stats.totalResearch +
      stats.totalWishlists >
    0;

  if (hasAnyEntities) {
    const statParts: string[] = [];
    if (stats.totalProducts > 0) {
      statParts.push(`${stats.totalProducts} product${stats.totalProducts > 1 ? 's' : ''}`);
    }
    if (stats.totalServices > 0) {
      statParts.push(`${stats.totalServices} service${stats.totalServices > 1 ? 's' : ''}`);
    }
    if (stats.totalProjects > 0) {
      statParts.push(`${stats.totalProjects} project${stats.totalProjects > 1 ? 's' : ''}`);
    }
    if (stats.totalCauses > 0) {
      statParts.push(`${stats.totalCauses} cause${stats.totalCauses > 1 ? 's' : ''}`);
    }
    if (stats.totalEvents > 0) {
      statParts.push(`${stats.totalEvents} event${stats.totalEvents > 1 ? 's' : ''}`);
    }
    if (stats.totalAssets > 0) {
      statParts.push(`${stats.totalAssets} asset${stats.totalAssets > 1 ? 's' : ''}`);
    }
    if (stats.totalLoans > 0) {
      statParts.push(`${stats.totalLoans} loan${stats.totalLoans > 1 ? 's' : ''}`);
    }
    if (stats.totalResearch > 0) {
      statParts.push(
        `${stats.totalResearch} research ${stats.totalResearch > 1 ? 'entities' : 'entity'}`
      );
    }
    if (stats.totalWishlists > 0) {
      statParts.push(`${stats.totalWishlists} wishlist${stats.totalWishlists > 1 ? 's' : ''}`);
    }
    if (stats.totalTasks > 0) {
      const taskStat = `${stats.totalTasks} active task${stats.totalTasks > 1 ? 's' : ''}`;
      statParts.push(
        stats.urgentTasks > 0 ? `${taskStat} (${stats.urgentTasks} urgent)` : taskStat
      );
    }
    if (stats.totalWallets > 0) {
      statParts.push(`${stats.totalWallets} wallet${stats.totalWallets > 1 ? 's' : ''}`);
    }

    sections.push(`## Activity Summary\nThe user has: ${statParts.join(', ')}.`);
  }

  if (sections.length === 0) {
    return '';
  }

  return `# User Context for Personalized Advice

${sections.join('\n\n')}

---
**Instructions for using this context**:
- Reference the user's profile, goals, skills, and entities when relevant
- If they ask about their products/services/projects, you have the details above
- Tailor your advice to their situation, background, and stated goals
- Help them leverage what they already have on OrangeCat
- Suggest ways to improve or expand their OrangeCat presence`;
}
