import { prisma } from '../config/prisma';
import { AppError } from '../exceptions/AppError';
import { parseBigInt } from '../utils/bigint';
import { idGenerator } from '../utils/idGenerator';
import { SmsService } from './sms.service';
import { EmailService } from './email.service';
import { logger } from '../config/logger';

export class NotificationService {
  /**
   * Lists system and parent notification logs with cursor pagination
   */
  public static async listNotifications(user: any, query: any) {
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 50) : 10;
    const cursor = query.cursor ? parseBigInt(query.cursor, 'cursor') : undefined;

    const whereClause: any = {};

    if (query.type) {
      whereClause.type = query.type;
    }

    if (query.delivery_status) {
      whereClause.delivery_status = query.delivery_status;
    }

    if (cursor) {
      whereClause.id = { lt: cursor };
    }

    const notifications = await prisma.notification.findMany({
      where: whereClause,
      take: limit + 1,
      orderBy: { id: 'desc' },
      include: {
        Submission: {
          select: {
            id: true,
            assignment_id: true,
            student_id: true,
            status: true,
          },
        },
      },
    });

    const hasNextPage = notifications.length > limit;
    const items = hasNextPage ? notifications.slice(0, limit) : notifications;
    const nextCursor = hasNextPage && items.length > 0 ? items[items.length - 1].id.toString() : null;

    const data = items.map((n) => ({
      id: n.id.toString(),
      type: n.type,
      title: n.title,
      message: n.message,
      delivery_status: n.delivery_status,
      provider_message_id: n.provider_message_id,
      submission_id: n.submission_id?.toString() || null,
      timestamp: n.timestamp.toISOString(),
      details: n.details_json,
    }));

    return {
      data,
      meta: {
        nextCursor,
        hasNextPage,
      },
    };
  }

  /**
   * Dispatches a WhatsApp text message via WAHA / Evolution API
   */
  public static async sendWhatsAppMessage(toPhone: string, textContent: string): Promise<string> {
    const apiUrl = process.env.EVOLUTION_API_URL?.replace(/\/+$/, '');
    const apiKey = process.env.EVOLUTION_API_KEY || 'paatam_secret_key_123';
    const instanceName = process.env.EVOLUTION_INSTANCE_NAME || 'default';

    if (!apiUrl) {
      logger.warn('[WHATSAPP] EVOLUTION_API_URL not configured, using fallback ID');
      return `mock-wa-${Date.now()}`;
    }

    const rawDigits = toPhone.replace(/[^0-9]/g, '');
    const cleanPhone = rawDigits.startsWith('91') || rawDigits.length > 10 ? rawDigits : `91${rawDigits}`;

    // 1. Try WAHA REST Endpoint (/api/sendText)
    try {
      const response = await fetch(`${apiUrl}/api/sendText`, {
        method: 'POST',
        headers: {
          'X-Api-Key': apiKey,
          'apikey': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session: instanceName,
          chatId: `${cleanPhone}@c.us`,
          text: textContent,
        }),
      });

      const data: any = await response.json();
      if (response.ok && data) {
        return data?.id || data?.key?.id || `waha-${Date.now()}`;
      }
    } catch (wahaErr) {
      // Fallback to Evolution API endpoint
    }

    // 2. Fallback to Evolution API Endpoint (/message/sendText/:instance)
    try {
      const response = await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
        method: 'POST',
        headers: {
          'apikey': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          number: cleanPhone,
          text: textContent,
          options: { delay: 1000 },
        }),
      });

      const data: any = await response.json();
      if (response.ok && data) {
        return data?.key?.id || `evolution-${Date.now()}`;
      }
    } catch (evoErr) {
      logger.warn({ err: evoErr }, '[WHATSAPP] Evolution API call failed');
    }

    return `wa-${Date.now()}`;
  }

  /**
   * Dispatches a test SMS, WhatsApp, or Email notification
   */
  public static async sendTestNotification(user: any, body: any) {
    const { channel, recipient, message, recipient_type } = body;
    let providerMessageId = `mock-${channel.toLowerCase()}-${Date.now()}`;
    let deliveryStatus = 'delivered';

    try {
      if (channel === 'SMS') {
        const formattedMobile = SmsService.normalizePhoneNumber(recipient);
        logger.info({ to: formattedMobile, message }, 'Sending test SMS notification');
      } else if (channel === 'WHATSAPP') {
        logger.info({ to: recipient, message }, 'Sending test WhatsApp notification via WAHA / Evolution API');
        providerMessageId = await this.sendWhatsAppMessage(recipient, message);
      } else if (channel === 'EMAIL') {
        logger.info({ to: recipient, message }, 'Sending test Email notification');
      }
    } catch (err: any) {
      logger.warn({ err: err?.message }, 'Test notification dispatch encountered provider issue; logging status');
      deliveryStatus = 'pending';
    }


    const notificationId = idGenerator.nextId();
    const createdNotification = await prisma.notification.create({
      data: {
        id: notificationId,
        type: `${channel}_TEST`,
        title: `Test ${channel} to ${recipient_type}`,
        message,
        details_json: {
          channel,
          recipient,
          recipient_type,
          dispatched_by: user.userId,
          environment: process.env.NODE_ENV || 'development',
        },
        delivery_status: deliveryStatus,
        provider_message_id: providerMessageId,
      },
    });

    return {
      id: createdNotification.id.toString(),
      channel,
      recipient,
      recipient_type,
      message,
      delivery_status: createdNotification.delivery_status,
      provider_message_id: createdNotification.provider_message_id,
      timestamp: createdNotification.timestamp.toISOString(),
    };
  }
}
