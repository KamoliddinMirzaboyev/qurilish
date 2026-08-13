import type { Response } from "express";
import type { NotificationType } from "@prisma/client";
import { prisma } from "./prisma.js";

export type NotificationDto = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

const clients = new Map<string, Set<Response>>();

function toDto(n: { id: string; type: NotificationType; title: string; body: string; link: string | null; readAt: Date | null; createdAt: Date }): NotificationDto {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    link: n.link,
    readAt: n.readAt ? n.readAt.toISOString() : null,
    createdAt: n.createdAt.toISOString(),
  };
}

export function subscribeNotifications(userId: string, res: Response) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();
  res.write(": ok\n\n");

  let set = clients.get(userId);
  if (!set) {
    set = new Set();
    clients.set(userId, set);
  }
  set.add(res);

  const keepAlive = setInterval(() => {
    res.write(": ping\n\n");
  }, 25000);

  reqOnClose(res, () => {
    clearInterval(keepAlive);
    set?.delete(res);
    if (set && set.size === 0) clients.delete(userId);
  });
}

function reqOnClose(res: Response, fn: () => void) {
  res.on("close", fn);
  res.req.on("close", fn);
}

function emit(userId: string, payload: NotificationDto) {
  const set = clients.get(userId);
  if (!set) return;
  const data = `event: notification\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of set) {
    res.write(data);
  }
}

export async function pushNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string | null;
}): Promise<void> {
  try {
    const created = await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        link: input.link ?? null,
      },
    });
    emit(input.userId, toDto(created));
  } catch {
    // notification must not break the main action
  }
}

export { toDto };
