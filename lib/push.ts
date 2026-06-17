import webpush from "web-push";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export type PushPayload = { title: string; body: string; url?: string };

export async function sendPush(
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: PushPayload
) {
  return webpush.sendNotification(sub as never, JSON.stringify(payload));
}
