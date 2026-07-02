import nodemailer from "nodemailer";
import { env } from "../../config/env";
import { EmailPublisher } from "./email.publisher.interface";

export class SMTPEmailPublisher implements EmailPublisher {
  private transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT),
    secure: false,
    auth:
      env.SMTP_USER && env.SMTP_PASS
        ? {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
          }
        : undefined,
  });

  async publishVerificationEmail(email: string, token: string): Promise<void> {
    console.log("SMTP CONFIG", {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      user: env.SMTP_USER,
      from: env.SMTP_FROM,
    });
    await this.transporter.verify();

    console.log("SMTP VERIFIED");

    const verificationUrl = `http://localhost:3000/verify-email?token=${token}`;

    await this.transporter.sendMail({
      from: env.SMTP_FROM,
      to: email,
      subject: "Verify your Nexus account",
      html: `
      <h2>Verify Email</h2>
      <a href="${verificationUrl}">
        Verify Email
      </a>
      <pre>${token}</pre>
    `,
    });

    console.log("MAIL SENT");
  }
}

export const emailPublisher = new SMTPEmailPublisher();
