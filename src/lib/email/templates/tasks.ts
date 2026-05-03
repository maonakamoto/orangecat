import { EMAIL_COLORS } from './layout';

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

const SHARED_CSS = `
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { padding: 20px; border-radius: 8px 8px 0 0; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .task-title { font-size: 20px; font-weight: 600; color: #111827; margin-bottom: 16px; }
    .message-box { background: white; padding: 16px; border-radius: 8px; margin: 16px 0; }
    .button { display: inline-block; background: ${EMAIL_COLORS.TIFFANY}; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; }
    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
`.trim();

function taskEmailHtml(
  gradient: { start: string; end: string; accent: string },
  headerTitle: string,
  bodyHtml: string,
  taskUrl: string,
  buttonLabel = 'View task'
): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    ${SHARED_CSS}
    .header { background: linear-gradient(135deg, ${gradient.start} 0%, ${gradient.end} 100%); }
    .message-box { border-left: 4px solid ${gradient.accent}; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${headerTitle}</h1>
    </div>
    <div class="content">
      ${bodyHtml}
      <p style="margin-top: 24px;">
        <a href="${taskUrl}" class="button">${buttonLabel}</a>
      </p>
    </div>
    <div class="footer">
      <p>This email was sent automatically by OrangeCat.</p>
    </div>
  </div>
</body>
</html>`.trim();
}

export function taskAttentionNotification(
  taskTitle: string,
  flaggedBy: string,
  message: string | null,
  taskUrl: string
): EmailContent {
  const gradient = { start: '#f59e0b', end: '#d97706', accent: '#f59e0b' };
  const bodyHtml = `
    <p class="task-title">${taskTitle}</p>
    <p><strong>${flaggedBy}</strong> has flagged this task as urgent.</p>
    ${message ? `<div class="message-box"><p>${message}</p></div>` : ''}
  `.trim();
  return {
    subject: `Task needs attention: ${taskTitle}`,
    html: taskEmailHtml(gradient, '⚠️ Task needs attention', bodyHtml, taskUrl),
    text: `Task needs attention: ${taskTitle}\n\n${flaggedBy} has flagged this task as urgent.${message ? `\nMessage: ${message}` : ''}\n\nView task: ${taskUrl}\n\n--\nThis email was sent automatically by OrangeCat.`,
  };
}

export function taskRequestNotification(
  taskTitle: string,
  requestedBy: string,
  message: string | null,
  taskUrl: string
): EmailContent {
  const gradient = { start: '#3b82f6', end: '#1d4ed8', accent: '#3b82f6' };
  const bodyHtml = `
    <p class="task-title">${taskTitle}</p>
    <p><strong>${requestedBy}</strong> is asking you to complete this task.</p>
    ${message ? `<div class="message-box"><p>${message}</p></div>` : ''}
  `.trim();
  return {
    subject: `Task request: ${taskTitle}`,
    html: taskEmailHtml(gradient, '📋 Task request', bodyHtml, taskUrl),
    text: `Task request: ${taskTitle}\n\n${requestedBy} is asking you to complete this task.${message ? `\nMessage: ${message}` : ''}\n\nView task: ${taskUrl}\n\n--\nThis email was sent automatically by OrangeCat.`,
  };
}

export function taskBroadcastRequestNotification(
  taskTitle: string,
  requestedBy: string,
  message: string | null,
  taskUrl: string
): EmailContent {
  const gradient = { start: '#8b5cf6', end: '#6d28d9', accent: '#8b5cf6' };
  const broadcastBadge = `<span style="display:inline-block;background:#f3e8ff;color:#7c3aed;padding:4px 12px;border-radius:16px;font-size:12px;font-weight:600;margin-bottom:12px;">To all team members</span>`;
  const bodyHtml = `
    ${broadcastBadge}
    <p class="task-title">${taskTitle}</p>
    <p><strong>${requestedBy}</strong> is asking the team to complete this task.</p>
    ${message ? `<div class="message-box"><p>${message}</p></div>` : ''}
  `.trim();
  return {
    subject: `Team task request: ${taskTitle}`,
    html: taskEmailHtml(gradient, '📢 Team task request', bodyHtml, taskUrl),
    text: `Team task request: ${taskTitle}\n\nTo all team members\n\n${requestedBy} is asking the team to complete this task.${message ? `\nMessage: ${message}` : ''}\n\nView task: ${taskUrl}\n\n--\nThis email was sent automatically by OrangeCat.`,
  };
}

export function newTaskNotification(
  taskTitle: string,
  createdBy: string,
  category: string,
  taskUrl: string
): EmailContent {
  const gradient = { start: '#10b981', end: '#059669', accent: '#10b981' };
  const categoryBadge = `<span style="display:inline-block;background:#d1fae5;color:#065f46;padding:4px 12px;border-radius:16px;font-size:12px;font-weight:600;">${category}</span>`;
  const bodyHtml = `
    <p class="task-title">${taskTitle}</p>
    <p><strong>${createdBy}</strong> has created a new task.</p>
    <p>${categoryBadge}</p>
  `.trim();
  return {
    subject: `New task: ${taskTitle}`,
    html: taskEmailHtml(gradient, '✨ New task', bodyHtml, taskUrl),
    text: `New task: ${taskTitle}\n\n${createdBy} has created a new task.\nCategory: ${category}\n\nView task: ${taskUrl}\n\n--\nThis email was sent automatically by OrangeCat.`,
  };
}

export function taskCompletedNotification(
  taskTitle: string,
  completedBy: string,
  notes: string | null,
  taskUrl: string
): EmailContent {
  const gradient = { start: '#22c55e', end: '#16a34a', accent: '#22c55e' };
  const bodyHtml = `
    <p class="task-title">${taskTitle}</p>
    <p><strong>${completedBy}</strong> has completed this task.</p>
    ${notes ? `<div class="message-box"><p><strong>Notes:</strong> ${notes}</p></div>` : ''}
  `.trim();
  return {
    subject: `Task completed: ${taskTitle}`,
    html: taskEmailHtml(gradient, '✅ Task completed', bodyHtml, taskUrl, 'View details'),
    text: `Task completed: ${taskTitle}\n\n${completedBy} has completed this task.${notes ? `\nNotes: ${notes}` : ''}\n\nView details: ${taskUrl}\n\n--\nThis email was sent automatically by OrangeCat.`,
  };
}
