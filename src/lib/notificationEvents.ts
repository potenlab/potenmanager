// ─── Notification Event Bus ──────────────────────────────────────────
// Decoupled pub/sub pattern for cross-context notification events.
// Contexts (Task, Goal, Team, Permission) emit events here,
// NotificationContext subscribes and converts them to user-facing notifications.

export type NotificationEventType =
  | 'task.created'
  | 'task.completed'
  | 'task.deadline_approaching'
  | 'task.assigned'
  | 'goal.progress_updated'
  | 'goal.completed'
  | 'goal.created'
  | 'team.member_joined'
  | 'team.member_removed'
  | 'role.changed'
  | 'invite.created'
  | 'invite.joined'
  | 'system.info';

export interface NotificationEvent {
  type: NotificationEventType;
  data: Record<string, any>;
  timestamp?: Date;
}

type Listener = (event: NotificationEvent) => void;

class NotificationEventBus {
  private listeners: Set<Listener> = new Set();

  on(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  emit(event: NotificationEvent) {
    const withTs = { ...event, timestamp: event.timestamp ?? new Date() };
    this.listeners.forEach(l => l(withTs));
  }
}

export const notificationBus = new NotificationEventBus();
