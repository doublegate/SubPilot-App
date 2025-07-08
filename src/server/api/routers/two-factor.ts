import { z } from 'zod';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';
import { encrypt, decrypt } from '@/server/lib/crypto-v2';
import { SMSService } from '@/server/services/sms';

// Generate random backup codes
function generateBackupCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = speakeasy
      .generateSecret({ length: 10 })
      .base32.replace(/[^A-Z0-9]/g, '')
      .slice(0, 8);
    codes.push(code);
  }
  return codes;
}

export const twoFactorRouter = createTRPCRouter({
  // Get current 2FA status
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        twoFactorEnabled: true,
        twoFactorMethod: true,
        twoFactorPhone: true,
        twoFactorVerifiedAt: true,
      },
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    return {
      enabled: user.twoFactorEnabled,
      method: user.twoFactorMethod,
      phone: user.twoFactorPhone
        ? // Mask phone number for display
          user.twoFactorPhone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
        : null,
      verifiedAt: user.twoFactorVerifiedAt,
    };
  }),

  // Setup authenticator app
  setupAuthenticator: protectedProcedure.mutation(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `SubPilot (${user.email})`,
      issuer: 'SubPilot',
      length: 32,
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url ?? '');

    // Encrypt and temporarily store the secret (not enabled yet)
    // Note: encryptedSecret is not used in this mutation

    // Store in session or temporary storage
    // For now, return it to the client (in production, store in Redis/session)
    return {
      secret: secret.base32,
      qrCode: qrCodeUrl,
      manualEntryKey: secret.base32,
    };
  }),

  // Verify and enable authenticator
  verifyAndEnableAuthenticator: protectedProcedure
    .input(
      z.object({
        secret: z.string(),
        code: z.string().length(6),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the code
      const verified = speakeasy.totp.verify({
        secret: input.secret,
        encoding: 'base32',
        token: input.code,
        window: 2,
      });

      if (!verified) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid verification code',
        });
      }

      // Generate backup codes
      const backupCodes = generateBackupCodes();
      const encryptedBackupCodes = await Promise.all(
        backupCodes.map(code => encrypt(code))
      );

      // Enable 2FA
      const encryptedSecret = await encrypt(input.secret);

      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: {
          twoFactorEnabled: true,
          twoFactorMethod: 'authenticator',
          twoFactorSecret: encryptedSecret,
          twoFactorBackupCodes: encryptedBackupCodes,
          twoFactorVerifiedAt: new Date(),
        },
      });

      // Log the security event
      await ctx.db.auditLog.create({
        data: {
          userId: ctx.session.user.id,
          action: 'security.2fa.enabled',
          result: 'success',
          metadata: {
            method: 'authenticator',
          },
        },
      });

      return {
        success: true,
        backupCodes,
      };
    }),

  // Setup SMS
  setupSMS: protectedProcedure
    .input(
      z.object({
        phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/),
      })
    )
    .mutation(async ({ ctx: _ctx, input }) => {
      // Normalize phone number
      const phone = input.phoneNumber.replace(/[^\d+]/g, '');

      // Generate verification code
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      // Send SMS (in development, this will log to console)
      await SMSService.send2FACode(phone, code);

      // Store the code temporarily (in production, use Redis with expiry)
      // For development, we'll accept any 6-digit code
      return {
        success: true,
        // Remove this in production
        mockCode: code,
        message: `Verification code sent to ${phone}`,
      };
    }),

  // Verify and enable SMS
  verifyAndEnableSMS: protectedProcedure
    .input(
      z.object({
        phoneNumber: z.string(),
        code: z.string().length(6),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // In production, verify the code from Redis/session
      // For now, we'll accept any 6-digit code for testing

      // Generate backup codes
      const backupCodes = generateBackupCodes();
      const encryptedBackupCodes = await Promise.all(
        backupCodes.map(code => encrypt(code))
      );

      // Encrypt phone number
      const encryptedPhone = await encrypt(input.phoneNumber);

      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: {
          twoFactorEnabled: true,
          twoFactorMethod: 'sms',
          twoFactorPhone: encryptedPhone,
          twoFactorBackupCodes: encryptedBackupCodes,
          twoFactorVerifiedAt: new Date(),
        },
      });

      // Log the security event
      await ctx.db.auditLog.create({
        data: {
          userId: ctx.session.user.id,
          action: 'security.2fa.enabled',
          result: 'success',
          metadata: {
            method: 'sms',
          },
        },
      });

      return {
        success: true,
        backupCodes,
      };
    }),

  // Disable 2FA
  disable: protectedProcedure
    .input(
      z.object({
        password: z.string().optional(), // For credential users
        code: z.string().optional(), // Current 2FA code for verification
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      // Verify current 2FA code if enabled
      if (user.twoFactorEnabled && input.code) {
        let isValid = false;

        if (user.twoFactorMethod === 'authenticator' && user.twoFactorSecret) {
          const decryptedSecret = await decrypt(user.twoFactorSecret);
          isValid = speakeasy.totp.verify({
            secret: decryptedSecret,
            encoding: 'base32',
            token: input.code,
            window: 2,
          });
        }

        if (!isValid) {
          // Check backup codes
          const backupCodes = user.twoFactorBackupCodes as string[];
          for (const encryptedCode of backupCodes) {
            const code = await decrypt(encryptedCode);
            if (code === input.code) {
              isValid = true;
              break;
            }
          }
        }

        if (!isValid) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Invalid verification code',
          });
        }
      }

      // Disable 2FA
      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: {
          twoFactorEnabled: false,
          twoFactorMethod: null,
          twoFactorPhone: null,
          twoFactorSecret: null,
          twoFactorBackupCodes: [],
          twoFactorVerifiedAt: null,
        },
      });

      // Log the security event
      await ctx.db.auditLog.create({
        data: {
          userId: ctx.session.user.id,
          action: 'security.2fa.disabled',
          result: 'success',
        },
      });

      return { success: true };
    }),

  // Regenerate backup codes
  regenerateBackupCodes: protectedProcedure
    .input(
      z.object({
        currentCode: z.string(), // Current 2FA code for verification
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (!user?.twoFactorEnabled) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '2FA is not enabled',
        });
      }

      // Verify current code
      let isValid = false;

      if (user.twoFactorMethod === 'authenticator' && user.twoFactorSecret) {
        const decryptedSecret = await decrypt(user.twoFactorSecret);
        isValid = speakeasy.totp.verify({
          secret: decryptedSecret,
          encoding: 'base32',
          token: input.currentCode,
          window: 2,
        });
      }

      if (!isValid) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Invalid verification code',
        });
      }

      // Generate new backup codes
      const backupCodes = generateBackupCodes();
      const encryptedBackupCodes = await Promise.all(
        backupCodes.map(code => encrypt(code))
      );

      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: {
          twoFactorBackupCodes: encryptedBackupCodes,
        },
      });

      return {
        success: true,
        backupCodes,
      };
    }),

  // Verify 2FA code (for login)
  verifyCode: protectedProcedure
    .input(
      z.object({
        code: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (!user?.twoFactorEnabled) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '2FA is not enabled',
        });
      }

      let isValid = false;
      let isBackupCode = false;

      // Check TOTP code
      if (user.twoFactorMethod === 'authenticator' && user.twoFactorSecret) {
        const decryptedSecret = await decrypt(user.twoFactorSecret);
        isValid = speakeasy.totp.verify({
          secret: decryptedSecret,
          encoding: 'base32',
          token: input.code,
          window: 2,
        });
      }

      // Check backup codes if TOTP failed
      if (!isValid) {
        const backupCodes = user.twoFactorBackupCodes as string[];
        for (let i = 0; i < backupCodes.length; i++) {
          const decryptedCode = await decrypt(backupCodes[i]!);
          if (decryptedCode === input.code) {
            isValid = true;
            isBackupCode = true;

            // Remove used backup code
            const newBackupCodes = [...backupCodes];
            newBackupCodes.splice(i, 1);

            await ctx.db.user.update({
              where: { id: ctx.session.user.id },
              data: {
                twoFactorBackupCodes: newBackupCodes,
              },
            });

            break;
          }
        }
      }

      if (!isValid) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Invalid verification code',
        });
      }

      // Update verification timestamp
      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: {
          twoFactorVerifiedAt: new Date(),
        },
      });

      return {
        success: true,
        isBackupCode,
        remainingBackupCodes: isBackupCode
          ? (user.twoFactorBackupCodes as string[]).length - 1
          : undefined,
      };
    }),
});
