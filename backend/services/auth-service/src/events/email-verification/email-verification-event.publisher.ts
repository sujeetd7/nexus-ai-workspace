import { env } from "../../config/env";
import {
  EmailVerificationRequestedEvent,
  IEmailVerificationEventPublisher,
} from "../../types/interfaces/email-verification-event-publisher.interface";

export class EmailVerificationEventPublisher
  implements IEmailVerificationEventPublisher
{
  async publishRequested(
    event: EmailVerificationRequestedEvent,
  ): Promise<void> {
    console.log({
      event: "EMAIL_VERIFICATION_REQUESTED",
      userId: event.userId,
      email: event.email,
      verificationUrl: event.verificationUrl,
      tokenPreview:
        env.NODE_ENV === "production"
          ? undefined
          : event.verificationToken.slice(0, 8),
      expiresAt: event.expiresAt,
      timestamp: new Date(),
    });
  }
}

export const emailVerificationEventPublisher =
  new EmailVerificationEventPublisher();
