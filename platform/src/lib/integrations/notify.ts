import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@prisma/client";

/**
 * Notification fan-out seam. `inApp` is fully implemented (writes a
 * Notification row, polled by the UI). `sms`/`email`/`push` are typed but
 * only log to the console — wiring a real Twilio/SES/FCM account later is a
 * matter of implementing the same interface, not restructuring callers.
 */
export interface NotificationChannel {
  send(input: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    relatedLoadId?: string;
  }): Promise<void>;
}

class InAppChannel implements NotificationChannel {
  async send(input: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    relatedLoadId?: string;
  }) {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        relatedLoadId: input.relatedLoadId,
      },
    });
  }
}

class StubChannel implements NotificationChannel {
  constructor(private label: "SMS" | "EMAIL" | "PUSH") {}
  async send(input: { userId: string; title: string; body: string }) {
    // No provider configured. In production this would call Twilio/SES/FCM.
    console.log(`[${this.label} stub — not sent] to user ${input.userId}: ${input.title}`);
  }
}

const inApp = new InAppChannel();
const sms = new StubChannel("SMS");
const email = new StubChannel("EMAIL");
const push = new StubChannel("PUSH");

/** Notifies a user in-app (always) and logs what would go out over other channels (Phase 2). */
export async function notifyUser(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  relatedLoadId?: string;
}) {
  await inApp.send(input);
  await Promise.all([sms.send(input), email.send(input), push.send(input)]);
}
