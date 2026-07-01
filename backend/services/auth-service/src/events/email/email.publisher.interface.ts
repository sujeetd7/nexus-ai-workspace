export interface EmailPublisher {
  publishVerificationEmail(email: string, token: string): Promise<void>;
}
