import { describe, expect, it } from 'vitest';
import { blankFields, contrastRatio, validateFields, valueForType } from './qrUtils';

describe('QR payloads', () => {
  it('normalizes web addresses', () => expect(valueForType('url', { value: 'example.com' })).toBe('https://example.com'));
  it('forms an email payload', () => expect(valueForType('email', { email: 'a@b.com', subject: 'Hello', body: '' })).toBe('mailto:a@b.com?subject=Hello'));
  it('forms a safe Wi-Fi payload', () => expect(valueForType('wifi', { ssid: 'Cafe;Net', password: 'secret', encryption: 'WPA', hidden: false })).toBe('WIFI:T:WPA;S:Cafe\\;Net;P:secret;H:false;;'));
});

describe('validation', () => {
  it('rejects incomplete type inputs', () => expect(validateFields('wifi', blankFields('wifi'))).toMatch(/network name/i));
  it('accepts a valid number', () => expect(validateFields('phone', { phone: '+91 98765 43210' })).toBe(''));
  it('identifies sufficient contrast', () => expect(contrastRatio('#000000', '#ffffff')).toBeGreaterThan(20));
});
