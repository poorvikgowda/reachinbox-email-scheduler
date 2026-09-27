import nodemailer from 'nodemailer';
import { config } from '../config';
import { logger } from '../utils/logger';

let transporter: nodemailer.Transporter | null = null;

async function getTransporter(): Promise<nodemailer.Transporter> {
  if (transporter) return transporter;

  let host = config.ethereal.host;
  let port = config.ethereal.port;
  let user = config.ethereal.user;
  let pass = config.ethereal.password;

  // If no user/pass provided in environment, generate test account automatically
  if (!user || !pass) {
    logger.info('[ETHEREAL] No Ethereal credentials found in env. Generating temporary test account...');
    const testAccount = await nodemailer.createTestAccount();
    host = testAccount.smtp.host;
    port = testAccount.smtp.port;
    user = testAccount.user;
    pass = testAccount.pass;
    logger.info(`[ETHEREAL] Account created: ${user}`);
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  return transporter;
}

export interface SendEmailOptions {
  from?: string;
  to: string;
  subject: string;
  body: string;
}

export interface SendEmailResult {
  messageId: string;
  previewUrl: string | false;
}

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const mailTransporter = await getTransporter();

  const info = await mailTransporter.sendMail({
    from: options.from || '"ReachInbox Lead Outreach" <scheduler@reachinbox.ai>',
    to: options.to,
    subject: options.subject,
    html: options.body,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);

  logger.info(`[ETHEREAL] Email sent successfully to ${options.to}. MessageId: ${info.messageId}`);
  if (previewUrl) {
    logger.info(`[ETHEREAL PREVIEW URL] ${previewUrl}`);
  }

  return {
    messageId: info.messageId,
    previewUrl,
  };
}
