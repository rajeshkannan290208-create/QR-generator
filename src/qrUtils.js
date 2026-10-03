export const DEFAULT_SETTINGS = {
  size: 320,
  foreground: '#102a43',
  background: '#ffffff',
  errorLevel: 'M',
  margin: 3,
};

export const QR_TYPES = {
  url: { label: 'Website', icon: '↗', hint: 'A link to open' },
  text: { label: 'Text', icon: 'Aa', hint: 'A short message' },
  email: { label: 'Email', icon: '✉', hint: 'Compose a message' },
  phone: { label: 'Phone', icon: '☎', hint: 'Call a number' },
  wifi: { label: 'Wi‑Fi', icon: '⌁', hint: 'Join a network' },
};

export const PRESETS = [
  { id: 'ocean', name: 'Ocean ink', foreground: '#0a3d62', background: '#eaf8ff', errorLevel: 'M', margin: 3 },
  { id: 'forest', name: 'Forest', foreground: '#174c3c', background: '#eff8e8', errorLevel: 'H', margin: 4 },
  { id: 'sunset', name: 'Sunset', foreground: '#822f4b', background: '#fff5e8', errorLevel: 'Q', margin: 3 },
  { id: 'mono', name: 'Classic', foreground: '#111827', background: '#ffffff', errorLevel: 'M', margin: 3 },
];

export function blankFields(type = 'url') {
  if (type === 'email') return { email: '', subject: '', body: '' };
  if (type === 'phone') return { phone: '' };
  if (type === 'wifi') return { ssid: '', password: '', encryption: 'WPA', hidden: false };
  return { value: '' };
}

export function valueForType(type, fields) {
  switch (type) {
    case 'url': {
      const value = fields.value?.trim() || '';
      if (!value) return '';
      return /^https?:\/\//i.test(value) ? value : `https://${value}`;
    }
    case 'text':
      return fields.value?.trim() || '';
    case 'email': {
      const email = fields.email?.trim() || '';
      if (!email) return '';
      const params = new URLSearchParams();
      if (fields.subject?.trim()) params.set('subject', fields.subject.trim());
      if (fields.body?.trim()) params.set('body', fields.body.trim());
      const query = params.toString();
      return `mailto:${email}${query ? `?${query}` : ''}`;
    }
    case 'phone':
      return fields.phone?.trim() ? `tel:${fields.phone.trim().replace(/[\s()-]/g, '')}` : '';
    case 'wifi': {
      const ssid = fields.ssid?.trim() || '';
      if (!ssid) return '';
      const escape = (input = '') => String(input).replace(/([\\;,:\"])/g, '\\$1');
      const encryption = fields.encryption === 'nopass' ? 'nopass' : fields.encryption || 'WPA';
      const password = encryption === 'nopass' ? '' : `P:${escape(fields.password)};`;
      return `WIFI:T:${encryption};S:${escape(ssid)};${password}H:${fields.hidden ? 'true' : 'false'};;`;
    }
    default:
      return '';
  }
}

export function validateFields(type, fields) {
  switch (type) {
    case 'url': {
      const value = fields.value?.trim();
      if (!value) return 'Enter a website address.';
      try {
        const parsed = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
        if (!parsed.hostname.includes('.')) return 'Enter a complete website address, such as example.com.';
      } catch {
        return 'Enter a valid website address.';
      }
      return '';
    }
    case 'text':
      return fields.value?.trim() ? '' : 'Enter some text to encode.';
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email?.trim() || '') ? '' : 'Enter a valid email address.';
    case 'phone':
      return /^[+]?\d[\d\s()-]{5,}$/.test(fields.phone?.trim() || '') ? '' : 'Enter a valid phone number.';
    case 'wifi':
      if (!fields.ssid?.trim()) return 'Enter the Wi‑Fi network name (SSID).';
      if (fields.encryption !== 'nopass' && !fields.password) return 'Enter the Wi‑Fi password or choose Open network.';
      return '';
    default:
      return '';
  }
}

export function relativeLuminance(hex) {
  const rgb = hex.replace('#', '').match(/.{2}/g)?.map((v) => parseInt(v, 16) / 255) || [0, 0, 0];
  const [r, g, b] = rgb.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a, b) {
  const lumA = relativeLuminance(a);
  const lumB = relativeLuminance(b);
  return (Math.max(lumA, lumB) + 0.05) / (Math.min(lumA, lumB) + 0.05);
}
