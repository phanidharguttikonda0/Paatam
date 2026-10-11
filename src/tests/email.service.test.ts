import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmailService, sesClient } from '../services/email.service';
import { SendEmailCommand } from '@aws-sdk/client-ses';
import { AppError } from '../exceptions/AppError';

describe('EmailService (AWS SES)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should send a verification OTP email with correct parameters', async () => {
    const sendSpy = vi.spyOn(sesClient, 'send').mockResolvedValue({} as any);

    await EmailService.sendOtpEmail('student@example.com', '123456', 'verification');

    expect(sendSpy).toHaveBeenCalledTimes(1);
    const commandCall = sendSpy.mock.calls[0][0] as SendEmailCommand;

    expect(commandCall).toBeInstanceOf(SendEmailCommand);
    expect(commandCall.input.Destination?.ToAddresses).toEqual(['student@example.com']);
    expect(commandCall.input.Source).toContain('noreply@paatam.in');
    expect(commandCall.input.Message?.Subject?.Data).toContain('123456');
    expect(commandCall.input.Message?.Body?.Html?.Data).toContain('123456');
    expect(commandCall.input.Message?.Body?.Html?.Data).toContain('Verify Your Email Address');
    expect(commandCall.input.Message?.Body?.Text?.Data).toContain('123456');
  });

  it('should support login purpose with tailored email content', async () => {
    const sendSpy = vi.spyOn(sesClient, 'send').mockResolvedValue({} as any);

    await EmailService.sendOtpEmail('admin@corporate.com', '654321', 'login');

    expect(sendSpy).toHaveBeenCalledTimes(1);
    const commandCall = sendSpy.mock.calls[0][0] as SendEmailCommand;

    expect(commandCall.input.Message?.Subject?.Data).toContain('Your Paatam Login Code: 654321');
    expect(commandCall.input.Message?.Body?.Html?.Data).toContain('Corporate Portal Login');
  });

  it('should support reset-password purpose with tailored email content', async () => {
    const sendSpy = vi.spyOn(sesClient, 'send').mockResolvedValue({} as any);

    await EmailService.sendOtpEmail('user@domain.com', '999888', 'reset-password');

    expect(sendSpy).toHaveBeenCalledTimes(1);
    const commandCall = sendSpy.mock.calls[0][0] as SendEmailCommand;

    expect(commandCall.input.Message?.Subject?.Data).toContain('Your Paatam Password Reset Code: 999888');
    expect(commandCall.input.Message?.Body?.Html?.Data).toContain('Password Reset Request');
  });

  it('should throw an AppError when AWS SES fails', async () => {
    vi.spyOn(sesClient, 'send').mockRejectedValue(new Error('SES Service Unavailable'));

    await expect(
      EmailService.sendOtpEmail('fail@domain.com', '111222', 'verification')
    ).rejects.toThrow(AppError);
  });
});
