export interface EmailVerificationRequestedEvent {
  userId: string;
  email: string;
  verificationToken: string;
  verificationUrl: string;
  expiresAt: Date;
}

export interface IEmailVerificationEventPublisher {
  publishRequested(event: EmailVerificationRequestedEvent): Promise<void>;
}
