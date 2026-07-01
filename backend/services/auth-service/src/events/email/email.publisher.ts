import { EmailPublisher } from "./email.publisher.interface";

export class ConsoleEmailPublisher implements EmailPublisher {
  async publishVerificationEmail(email: string, token: string): Promise<void> {
    console.log("\n========== EMAIL VERIFICATION ==========");

    console.log("EMAIL:", email);

    console.log("VERIFY TOKEN:", token);

    console.log("VERIFY URL:", `http://localhost:3000/verify?token=${token}`);

    console.log("========================================\n");
  }
}

export const emailPublisher = new ConsoleEmailPublisher();
