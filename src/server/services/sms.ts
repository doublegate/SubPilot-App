/**
 * SMS Service for sending 2FA codes
 *
 * In production, this would integrate with a real SMS provider like Twilio
 * For development, we'll use console logging
 */

interface SMSMessage {
  to: string;
  body: string;
}

export class SMSService {
  static async sendSMS(message: SMSMessage): Promise<void> {
    // In production, integrate with Twilio or another SMS provider
    // For now, we'll just log to console
    console.log('=== SMS MESSAGE ===');
    console.log(`To: ${message.to}`);
    console.log(`Body: ${message.body}`);
    console.log('==================');

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  static async send2FACode(phoneNumber: string, code: string): Promise<void> {
    const message = {
      to: phoneNumber,
      body: `Your SubPilot verification code is: ${code}. This code will expire in 5 minutes.`,
    };

    await this.sendSMS(message);
  }
}
