import nodemailer, { Transporter, TransportOptions } from 'nodemailer';
import config from '../config';
import logger from '../utils/logger';
import Handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';
import User from '../models/user.model';

interface UserType {
    email: string;
    firstName: string;
    wallet: {
        balance: number;
    };
}

interface TemplateContext {
    [key: string]: any;
}

class NotificationService {
    private transporter: Transporter;
    private templates: { [key: string]: Handlebars.TemplateDelegate };
    private baseTemplate!: Handlebars.TemplateDelegate;

    constructor() {
        this.transporter = this.createTransporter();
        this.templates = {};
        Handlebars.registerHelper('eq', function (a: any, b: any) {
            return a === b;
        });
        this.loadEmailTemplates().then(() => {
            logger.info('Email templates loaded successfully');
        }).catch((error) => {
            logger.error('Error loading email templates:', error);
        });
    }

    private createTransporter(): Transporter {
        const useMailHog = process.env.USE_MAILHOG === 'true';
        if (!config.emailHost || !config.emailPort) {
            throw new Error('Email configuration is missing');
        }

        if (useMailHog) {
            logger.info("email configuration: " + config.emailHost.toString() + ' ' + config.emailPort.toString());
            logger.info('Using MailHog for email testing');
            const mailHogOptions: nodemailer.TransportOptions = {
                host: 'localhost',
                port: 1025,
                ignoreTLS: true,
                secure: false,
                auth: null
            } as any;
            return nodemailer.createTransport(mailHogOptions);
        } else {
            logger.info('Using configured SMTP server for emails');
            const smtpOptions: nodemailer.TransportOptions = {
                host: config.emailHost,
                port: config.emailPort,
                auth: {
                    user: config.emailUsername,
                    pass: config.emailPassword
                }

            } as any;
            return nodemailer.createTransport(smtpOptions);
        }
    }

    private async loadEmailTemplates(): Promise<void> {
        try {
            const templateDir = path.join(__dirname, '../templates');
            logger.info('Resolving template directory path:', templateDir);

            const baseTemplatePath = path.join(templateDir, 'base-email-template.html');
            logger.info('Base template path:', baseTemplatePath);

            const baseTemplateContent = await fs.readFile(baseTemplatePath, 'utf-8');
            this.baseTemplate = Handlebars.compile(baseTemplateContent);

            const templateFiles = [
                'verification',
                'login',
                'deposit',
                'kyc-verification',
                'qr-payment',
                'transfer',
                'withdrawal',
                'wallet-creation',
                'payment-method-added'
            ];

            for (const file of templateFiles) {
                const templatePath = path.join(templateDir, `${file}-email-template.html`);
                logger.info(`Loading template: ${file}, Path: ${templatePath}`);

                try {
                    const templateContent = await fs.readFile(templatePath, 'utf-8');
                    this.templates[file] = Handlebars.compile(templateContent);
                    logger.info(`Loaded template: ${file}`);
                } catch (error: unknown) {
                    if (error instanceof Error) {
                        logger.error(`Error loading template ${file}:`, error.message);
                        throw new Error(`Failed to load email templates: ${error.message}`);
                    } else {
                        logger.error('An unknown error occurred:', String(error));
                        throw new Error('Failed to load email templates: An unknown error occurred.');
                    }
                }
            }

            logger.info('Email templates loaded successfully:', Object.keys(this.templates));
        } catch (error: unknown) {
            if (error instanceof Error) {
                logger.error('Error loading email templates:', error.message);
                throw new Error(`Failed to load email templates: ${error.message}`);
            } else {
                logger.error('An unknown error occurred:', String(error));
                throw new Error('Failed to load email templates: An unknown error occurred.');
            }
        }
    }

    public async ensureTemplatesLoaded(): Promise<void> {
        if (Object.keys(this.templates).length === 0) {
            logger.warn('Templates not loaded yet. Waiting for loading to complete.');
            await this.loadEmailTemplates();
        }
    }


    private async sendEmail(to: string, subject: string, templateName: string, context: TemplateContext): Promise<void> {
        try {
            await this.ensureTemplatesLoaded();
            if (!this.templates[templateName]) {
                logger.error(`Template '${templateName}' not found. Available templates:`, Object.keys(this.templates));
                throw new Error(`Email template '${templateName}' not found`);
            }

            logger.debug(`Rendering template: ${templateName}`);
            logger.debug('Template context:', context);

            const template = this.templates[templateName];
            const content = template(context);
            logger.debug('Rendered template content:', content);

            if (!this.baseTemplate) {
                throw new Error('Base template not loaded');
            }

            const html = this.baseTemplate({ content, subject, ...context });

            const mailOptions = {
                from: 'Your E-Wallet <noreply@coderstudio.co>',
                to,
                subject,
                html
            };

            logger.debug('Mail options:', mailOptions);

            await this.transporter.sendMail(mailOptions);
            logger.info(`Email sent to ${to} using template ${templateName}`);

            if (process.env.USE_MAILHOG === 'true') {
                logger.info(`MailHog Web Interface: http://localhost:8025`);
                logger.info(`Check MailHog to view the sent email.`);
            }
        } catch (error: unknown) {
            if (error instanceof Error) {
                logger.error('Error sending email:', error.message);
            } else {
                logger.error('An unknown error occurred:', String(error));
            }
            logger.error('Template name:', templateName);
            logger.error('Context:', context);
            throw new Error(`Failed to send email notification: ${error instanceof Error ? error.message : 'An unknown error occurred'}`);
        }

    }


    public async sendSMS(phoneNumber: string, message: string): Promise<void> {
        try {
            // Implement SMS sending logic here
            // You might want to use a service like Twilio for this
            logger.info(`SMS sent to ${phoneNumber}: ${message}`);
        } catch (error: unknown) {
            logger.error('Error sending SMS:', error);
            throw new Error(`Failed to send SMS: ${error instanceof Error ? error.message : 'An unknown error occurred'}`);
        }
    }

    public async sendPushNotification(userId: string, title: string, body: string): Promise<void> {
        try {
            // Implement push notification logic here
            // You might want to use a service like Firebase Cloud Messaging for this
            logger.info(`Push notification sent to user ${userId}: ${title} - ${body}`);
        } catch (error: unknown) {
            logger.error('Error sending push notification:', error);
            throw new Error(`Failed to send push notification: ${error instanceof Error ? error.message : 'An unknown error occurred'}`);
        }
    }

    public async notifyEmailVerification(user: UserType, verificationLink: string): Promise<boolean> {
        try {
            await this.sendEmail(
                user.email,
                'Verify Your E-Wallet Email',
                'verification',
                {
                    firstName: user.firstName,
                    verificationLink
                }
            );
            logger.info(`Verification email sent successfully to ${user.email}`);
            return true;
        } catch (error) {
            logger.error(`Error sending verification email to ${user.email}:`, error);
            return false;
        }
    }

    public async notifyLogin(user: UserType, loginTime: string, loginLocation: string): Promise<void> {
        try {
            await this.sendEmail(
                user.email,
                'New Login to Your E-Wallet Account',
                'login',
                {
                    firstName: user.firstName,
                    loginTime,
                    loginLocation,
                    secureAccountLink: `${config.appUrl}/secure-account` // Update with actual link
                }
            );
        } catch (error) {
            logger.error('Error in notifyLogin:', error);
            // We don't throw here to prevent login process from failing due to notification error
        }
    }

    public async notifyDeposit(userId: string, amount: number, transactionId: string): Promise<void> {
        try {
            const user = await User.findById(userId);
            if (!user) throw new Error('User not found');

            await this.sendEmail(
                user.email,
                'Deposit Successful',
                'deposit',
                {
                    firstName: user.firstName,
                    amount,
                    transactionId,
                    transactionDate: new Date().toLocaleString(),
                    viewBalanceLink: `${config.appUrl}/wallet/balance`
                }
            );
        } catch (error: unknown) {
            logger.error('Error in notifyDeposit:', error);
            throw new Error(`Failed to send deposit notification: ${error instanceof Error ? error.message : 'An unknown error occurred'}`);
        }
    }

    public async notifyKYCUpdate(userId: string, kycStatus: string, rejectionReason: string | null = null): Promise<void> {
        try {
            const user = await User.findById(userId);
            if (!user) throw new Error('User not found');

            await this.sendEmail(
                user.email,
                'KYC Verification Update',
                'kyc-verification',
                {
                    firstName: user.firstName,
                    kycStatus,
                    rejectionReason,
                    accountLink: `${config.appUrl}/account`,
                    resubmitLink: `${config.appUrl}/kyc/resubmit`
                }
            );
        } catch (error: unknown) {
            logger.error('Error in notifyKYCUpdate:', error);
            throw new Error(`Failed to send KYC update notification: ${error instanceof Error ? error.message : 'An unknown error occurred'}`);
        }
    }

    public async notifyQRPayment(payerId: string, recipientId: string, amount: number, transactionId: string, paymentStatus: string): Promise<void> {
        try {
            logger.info(`Notifying QR payment. Payer: ${payerId}, Recipient: ${recipientId}`);

            const [payer, recipient] = await Promise.all([
                User.findById(payerId),
                User.findById(recipientId)
            ]);

            if (!payer) {
                logger.error(`Payer not found. ID: ${payerId}`);
                throw new Error(`Payer not found. ID: ${payerId}`);
            }
            if (!recipient) {
                logger.error(`Recipient not found. ID: ${recipientId}`);
                throw new Error(`Recipient not found. ID: ${recipientId}`);
            }

            await Promise.all([
                this.sendEmail(
                    payer.email,
                    'QR Payment Sent',
                    'qr-payment',
                    {
                        firstName: payer.firstName,
                        paymentStatus: 'sent',
                        amount,
                        transactionId,
                        transactionDate: new Date().toLocaleString(),
                        transactionDetailsLink: `${config.appUrl}/transactions/${transactionId}`
                    }
                ),
                this.sendEmail(
                    recipient.email,
                    'QR Payment Received',
                    'qr-payment',
                    {
                        firstName: recipient.firstName,
                        paymentStatus: 'received',
                        amount,
                        transactionId,
                        transactionDate: new Date().toLocaleString(),
                        transactionDetailsLink: `${config.appUrl}/transactions/${transactionId}`
                    }
                )
            ]);
        } catch (error: unknown) {
            logger.error('Error in notifyQRPayment:', error);
            throw new Error(`Failed to send QR payment notification: ${error instanceof Error ? error.message : 'An unknown error occurred'}`);
        }
    }

    public async notifyTransfer(userId: string, amount: number, transactionId: string): Promise<void> {
        try {
            const user = await User.findById(userId);
            if (!user) throw new Error('User not found');

            await this.sendEmail(
                user.email,
                'Transfer Notification',
                'transfer',
                {
                    firstName: user.firstName,
                    amount,
                    transactionId,
                    transactionDate: new Date().toLocaleString(),
                    viewTransactionLink: `${config.appUrl}/transactions/${transactionId}`
                }
            );
        } catch (error: unknown) {
            if (error instanceof Error) {
                logger.error('Error in notifyTransfer:', error.message);
                throw new Error(`Failed to send transfer notification: ${error.message}`);
            } else {
                logger.error('An unknown error occurred in notifyTransfer:', String(error));
                throw new Error('Failed to send transfer notification due to an unknown error');
            }
        }
    }

    public async notifyWithdrawal(userId: string, amount: number, transactionId: string): Promise<void> {
        try {
            const user = await User.findById(userId);
            if (!user) throw new Error('User not found');

            await this.sendEmail(
                user.email,
                'Withdrawal Notification',
                'withdrawal',
                {
                    firstName: user.firstName,
                    amount,
                    transactionId,
                    transactionDate: new Date().toLocaleString(),
                    viewTransactionLink: `${config.appUrl}/transactions/${transactionId}`
                }
            );
        } catch (error: unknown) {
            if (error instanceof Error) {
                logger.error('Error in notifyWithdrawal:', error.message);
                throw new Error(`Failed to send withdrawal notification: ${error.message}`);
            } else {
                logger.error('An unknown error occurred in notifyWithdrawal:', String(error));
                throw new Error('Failed to send withdrawal notification due to an unknown error');
            }
        }
    }

    public async notifyWalletCreation(userId: string): Promise<void> {
        try {
            const user = await User.findById(userId);
            if (!user) throw new Error('User not found');

            await this.sendEmail(
                user.email,
                'Wallet Created Successfully',
                'wallet-creation',
                {
                    firstName: user.firstName,
                    walletBalance: user.wallet.balance,
                    manageWalletLink: `${config.appUrl}/wallet`
                }
            );
        } catch (error: unknown) {
            logger.error('Error in notifyWalletCreation:', error);
            throw new Error(`Failed to send wallet creation notification: ${error instanceof Error ? error.message : 'An unknown error occurred'}`);
        }
    }

    public async notifyPaymentMethodAdded(userId: string, paymentMethod: string): Promise<void> {
        try {
            const user = await User.findById(userId);
            if (!user) throw new Error('User not found');

            await this.sendEmail(
                user.email,
                'Payment Method Added',
                'payment-method-added',
                {
                    firstName: user.firstName,
                    paymentMethod,
                    managePaymentMethodsLink: `${config.appUrl}/payment-methods`
                }
            );
        } catch (error: unknown) {
            logger.error('Error in notifyPaymentMethodAdded:', error);
            throw new Error(`Failed to send payment method added notification: ${error instanceof Error ? error.message : 'An unknown error occurred'}`);
        }
    }
}

export default NotificationService;