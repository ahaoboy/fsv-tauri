import { useState, useEffect } from 'preact/hooks';
import QRCodeLib from 'qrcode';

interface QRCodeProps {
  url: string;
  size?: number;
}

/**
 * QRCode component for displaying QR codes
 * @param url - The URL to encode in the QR code
 * @param size - The size of the QR code (default: 180)
 */
export function QRCode({ url, size = 180 }: QRCodeProps) {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    if (!url) return;
    
    QRCodeLib.toDataURL(url, {
      width: size,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    })
      .then(setDataUrl)
      .catch(console.error);
  }, [url, size]);

  if (!dataUrl) {
    return (
      <div class="qr-placeholder" style={{ width: size, height: size }}>
        <div class="qr-loading">Generating QR...</div>
      </div>
    );
  }

  return (
    <div class="qr-container">
      <img 
        src={dataUrl} 
        width={size} 
        height={size} 
        alt={`QR code for ${url}`}
        class="qr-image"
      />
    </div>
  );
}