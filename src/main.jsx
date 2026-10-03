import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import QRCode from 'qrcode';
import './styles.css';
import { DEFAULT_SETTINGS, PRESETS, QR_TYPES, blankFields, contrastRatio, validateFields, valueForType } from './qrUtils';

const STORAGE_KEY = 'qr-studio-recent-v1';
const MAX_RECENTS = 6;

function App() {
  const [type, setType] = useState('url');
  const [fields, setFields] = useState(() => blankFields('url'));
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [recents, setRecents] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
  });
  const [preview, setPreview] = useState('');
  const [renderError, setRenderError] = useState('');
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef(null);

  const validationError = useMemo(() => validateFields(type, fields), [type, fields]);
  const payload = useMemo(() => valueForType(type, fields), [type, fields]);
  const contrast = useMemo(() => contrastRatio(settings.foreground, settings.background), [settings.foreground, settings.background]);
  const warnings = useMemo(() => {
    const notes = [];
    if (contrast < 3) notes.push('Low contrast can make this code hard to scan. Aim for 4.5:1 or higher.');
    if (settings.size < 180) notes.push('Small codes can be difficult to scan in print.');
    if (settings.margin < 2) notes.push('A quiet zone of at least 2 modules is recommended around a QR code.');
    if (payload.length > 160 && settings.errorLevel === 'L') notes.push('Long content with low error correction may scan less reliably.');
    return notes;
  }, [contrast, settings.size, settings.margin, payload.length, settings.errorLevel]);

  useEffect(() => {
    if (!payload || validationError) { setPreview(''); setRenderError(''); return; }
    let cancelled = false;
    QRCode.toDataURL(payload, {
      errorCorrectionLevel: settings.errorLevel,
      margin: Number(settings.margin),
      width: Number(settings.size),
      color: { dark: settings.foreground, light: settings.background },
    }).then((url) => {
      if (!cancelled) { setPreview(url); setRenderError(''); }
    }).catch(() => { if (!cancelled) setRenderError('This content is too long to encode with these settings.'); });
    return () => { cancelled = true; };
  }, [payload, validationError, settings]);

  useEffect(() => {
    if (!preview || !canvasRef.current) return;
    const image = new Image();
    image.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = settings.size;
      canvas.height = settings.size;
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0, settings.size, settings.size);
    };
    image.src = preview;
  }, [preview, settings.size]);

  const updateField = (key, value) => setFields((current) => ({ ...current, [key]: value }));
  const updateSetting = (key, value) => setSettings((current) => ({ ...current, [key]: value }));

  const changeType = (nextType) => {
    setType(nextType);
    setFields(blankFields(nextType));
  };

  const applyPreset = (preset) => setSettings((current) => ({ ...current, ...preset }));

  const saveRecent = () => {
    if (!preview || validationError) return;
    const item = { id: crypto.randomUUID(), type, fields, settings, label: recentLabel(type, fields), createdAt: Date.now() };
    const next = [item, ...recents.filter((entry) => valueForType(entry.type, entry.fields) !== payload)].slice(0, MAX_RECENTS);
    setRecents(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const download = () => {
    if (!preview || validationError) return;
    saveRecent();
    const anchor = document.createElement('a');
    anchor.href = preview;
    anchor.download = `qr-${type}-${Date.now()}.png`;
    anchor.click();
  };

  const copyToClipboard = async () => {
    if (!payload || validationError) return;
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { setRenderError('Copying is unavailable in this browser.'); }
  };

  const reuseRecent = (item) => {
    setType(item.type);
    setFields(item.fields);
    setSettings(item.settings);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearRecents = () => { setRecents([]); localStorage.removeItem(STORAGE_KEY); };

  return (
    <main>
      <section className="hero">
        <div className="brand"><span className="brand-mark">⌘</span><span>QR Studio</span></div>
        <div className="hero-copy"><p className="eyebrow">Browser-only QR designer</p><h1>Make every scan<br /><em>feel intentional.</em></h1><p>Create a polished, dependable code for any moment — no account, no uploads, no waiting.</p></div>
        <div className="hero-orb orb-one" /><div className="hero-orb orb-two" />
      </section>

      <section className="workspace" aria-label="QR code designer">
        <div className="controls card">
          <div className="section-heading"><span className="section-number">01</span><div><p className="eyebrow">Content</p><h2>What should it do?</h2></div></div>
          <div className="type-grid">
            {Object.entries(QR_TYPES).map(([key, item]) => <button key={key} className={`type-button ${type === key ? 'selected' : ''}`} onClick={() => changeType(key)}><span className="type-icon">{item.icon}</span><span>{item.label}</span><small>{item.hint}</small></button>)}
          </div>
          <ContentFields type={type} fields={fields} updateField={updateField} />
          {validationError && <p className="validation" role="alert">{validationError}</p>}

          <div className="rule" />
          <div className="section-heading"><span className="section-number">02</span><div><p className="eyebrow">Style</p><h2>Make it yours</h2></div></div>
          <div className="presets"><span className="field-label">Quick palettes</span><div className="preset-row">{PRESETS.map((preset) => <button className="preset" key={preset.id} onClick={() => applyPreset(preset)} title={preset.name}><i style={{ background: preset.foreground }} /><i style={{ background: preset.background }} /><span>{preset.name}</span></button>)}</div></div>
          <div className="style-grid">
            <ColorField label="Code color" value={settings.foreground} onChange={(value) => updateSetting('foreground', value)} />
            <ColorField label="Canvas color" value={settings.background} onChange={(value) => updateSetting('background', value)} />
            <label className="field"><span>Size <b>{settings.size}px</b></span><input type="range" min="160" max="720" step="20" value={settings.size} onChange={(event) => updateSetting('size', Number(event.target.value))} /></label>
            <label className="field"><span>Quiet zone <b>{settings.margin}</b></span><input type="range" min="0" max="8" step="1" value={settings.margin} onChange={(event) => updateSetting('margin', Number(event.target.value))} /></label>
            <label className="field select-field"><span>Error correction</span><select value={settings.errorLevel} onChange={(event) => updateSetting('errorLevel', event.target.value)}><option value="L">Low — 7%</option><option value="M">Medium — 15%</option><option value="Q">Quartile — 25%</option><option value="H">High — 30%</option></select></label>
            <div className="contrast-card"><span>Contrast ratio</span><strong className={contrast < 3 ? 'poor' : contrast < 4.5 ? 'okay' : ''}>{contrast.toFixed(1)}:1</strong><small>{contrast >= 4.5 ? 'Excellent for scanning' : contrast >= 3 ? 'Usable, but improve if possible' : 'Too low for reliable scans'}</small></div>
          </div>
        </div>

        <aside className="preview-panel card">
          <div className="preview-top"><div><p className="eyebrow">Live preview</p><h2>Your code</h2></div><span className={`status ${preview && !validationError ? 'ready' : ''}`}><i />{preview && !validationError ? 'Ready' : 'Waiting'}</span></div>
          <div className={`qr-stage ${preview ? 'has-code' : ''}`} style={{ '--preview-bg': settings.background }}>
            {preview ? <img src={preview} alt="Generated QR code" /> : <div className="placeholder"><span>⌁</span><p>Enter your content<br />to generate a code</p></div>}
          </div>
          <canvas ref={canvasRef} className="sr-only" aria-hidden="true" />
          {renderError && <p className="validation" role="alert">{renderError}</p>}
          {warnings.length > 0 && <div className="warning"><span>!</span><div><strong>Scan check</strong>{warnings.map((warning) => <p key={warning}>{warning}</p>)}</div></div>}
          <div className="preview-actions"><button className="button primary" disabled={!preview || Boolean(validationError)} onClick={download}>↓ Download PNG</button><button className="button secondary" disabled={!payload || Boolean(validationError)} onClick={copyToClipboard}>{copied ? 'Copied!' : 'Copy data'}</button></div>
          <p className="privacy-note">Your content stays in this browser.</p>
        </aside>
      </section>

      <section className="recents-section">
        <div className="recent-heading"><div><p className="eyebrow">Local library</p><h2>Recent creations</h2></div>{recents.length > 0 && <button className="text-button" onClick={clearRecents}>Clear all</button>}</div>
        {recents.length ? <div className="recent-grid">{recents.map((item) => <button className="recent-card" onClick={() => reuseRecent(item)} key={item.id}><RecentQR item={item} /><span className="recent-type">{QR_TYPES[item.type]?.icon} {QR_TYPES[item.type]?.label}</span><strong>{item.label}</strong><small>{new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · Reuse →</small></button>)}</div> : <div className="empty-recents"><span>▦</span><p>Your downloaded codes will appear here, ready to reuse.</p></div>}
      </section>
      <footer>Designed to be scanned, stored only on your device.</footer>
    </main>
  );
}

function ContentFields({ type, fields, updateField }) {
  if (type === 'email') return <div className="content-fields"><Field label="Email address" type="email" value={fields.email} placeholder="hello@example.com" onChange={(value) => updateField('email', value)} /><Field label="Subject (optional)" value={fields.subject} placeholder="A quick note" onChange={(value) => updateField('subject', value)} /><TextArea label="Message (optional)" value={fields.body} placeholder="Write your message" onChange={(value) => updateField('body', value)} /></div>;
  if (type === 'phone') return <div className="content-fields"><Field label="Phone number" type="tel" value={fields.phone} placeholder="+91 98765 43210" onChange={(value) => updateField('phone', value)} /></div>;
  if (type === 'wifi') return <div className="content-fields"><Field label="Network name (SSID)" value={fields.ssid} placeholder="Coffee Shop Wi‑Fi" onChange={(value) => updateField('ssid', value)} /><div className="two-fields"><label className="field"><span>Security</span><select value={fields.encryption} onChange={(event) => updateField('encryption', event.target.value)}><option value="WPA">WPA / WPA2</option><option value="WEP">WEP</option><option value="nopass">Open network</option></select></label>{fields.encryption !== 'nopass' && <Field label="Password" type="password" value={fields.password} placeholder="Network password" onChange={(value) => updateField('password', value)} />}</div><label className="checkbox"><input type="checkbox" checked={fields.hidden} onChange={(event) => updateField('hidden', event.target.checked)} /><span>Hidden network</span></label></div>;
  return <div className="content-fields">{type === 'url' ? <Field label="Website address" type="url" value={fields.value} placeholder="example.com" onChange={(value) => updateField('value', value)} /> : <TextArea label="Your text" value={fields.value} placeholder="A little message, a big idea..." onChange={(value) => updateField('value', value)} />}</div>;
}

function Field({ label, value, onChange, ...props }) { return <label className="field"><span>{label}</span><input value={value || ''} onChange={(event) => onChange(event.target.value)} {...props} /></label>; }
function TextArea({ label, value, onChange, ...props }) { return <label className="field"><span>{label}</span><textarea value={value || ''} onChange={(event) => onChange(event.target.value)} {...props} /></label>; }
function ColorField({ label, value, onChange }) { return <label className="field color-field"><span>{label}</span><div><input type="color" value={value} onChange={(event) => onChange(event.target.value)} /><input className="color-text" value={value.toUpperCase()} maxLength="7" onChange={(event) => /^#[0-9a-fA-F]{0,6}$/.test(event.target.value) && onChange(event.target.value)} /></div></label>; }
function RecentQR({ item }) { const [src, setSrc] = useState(''); const payload = useMemo(() => valueForType(item.type, item.fields), [item]); useEffect(() => { QRCode.toDataURL(payload, { errorCorrectionLevel: item.settings.errorLevel, margin: item.settings.margin, width: 100, color: { dark: item.settings.foreground, light: item.settings.background } }).then(setSrc); }, [payload, item]); return src ? <img src={src} alt="" /> : <div className="recent-skeleton" />; }
function recentLabel(type, fields) { if (type === 'email') return fields.email; if (type === 'phone') return fields.phone; if (type === 'wifi') return fields.ssid; return fields.value?.trim().slice(0, 38) || QR_TYPES[type].label; }

createRoot(document.getElementById('root')).render(<App />);
