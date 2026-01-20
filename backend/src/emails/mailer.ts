import { Resend } from "resend";
import { mailEnv } from "../validators/mailer.schema";

const resend = new Resend(mailEnv.RESEND_API_KEY);

export type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
};

export const sendEmail = async ({ to, subject, html }: SendEmailOptions): Promise<void> => {
  await resend.emails.send({
    from: mailEnv.MAIL_FROM,
    to,
    subject,
    html,
  });
};
