/**
 * Generates PWA icons dynamically using Canvas API
 */

export interface IconConfig {
  size: number;
  backgroundColor?: string;
  textColor?: string;
  text?: string;
}

/**
 * Creates a canvas with a simple icon design
 */
function createIconCanvas(config: IconConfig): HTMLCanvasElement {
  const { size, backgroundColor = '#000000', textColor = '#ffffff', text = 'S' } = config;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, size, size);

  // Draw a pen/signature icon
  ctx.strokeStyle = textColor;
  ctx.lineWidth = size / 20;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Simple pen stroke design
  ctx.beginPath();
  const padding = size * 0.2;
  const startX = padding;
  const startY = size - padding;
  const endX = size - padding;
  const endY = padding;

  // Curved signature line
  ctx.moveTo(startX, startY);
  ctx.bezierCurveTo(
    startX + (endX - startX) * 0.3, startY - size * 0.1,
    startX + (endX - startX) * 0.5, startY - size * 0.3,
    endX, endY
  );
  ctx.stroke();

  // Add a second decorative stroke
  ctx.beginPath();
  ctx.moveTo(startX + size * 0.1, startY - size * 0.15);
  ctx.quadraticCurveTo(
    size / 2, size / 2,
    endX - size * 0.1, endY + size * 0.1
  );
  ctx.stroke();

  return canvas;
}

/**
 * Converts canvas to blob
 */
async function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png'): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to convert canvas to blob'));
      }
    }, type);
  });
}

/**
 * Generates icon blob for a given size
 */
export async function generateIcon(size: number): Promise<Blob> {
  const canvas = createIconCanvas({ size });
  return canvasToBlob(canvas);
}

/**
 * Generates icon as data URL
 */
export function generateIconDataURL(size: number): string {
  const canvas = createIconCanvas({ size });
  return canvas.toDataURL('image/png');
}

/**
 * Updates the PWA manifest with dynamically generated icons
 */
export async function updateManifestIcons(): Promise<void> {
  const sizes = [192, 512];
  const icons = sizes.map(size => ({
    src: generateIconDataURL(size),
    sizes: `${size}x${size}`,
    type: 'image/png',
    purpose: 'any maskable'
  }));

  // Create dynamic manifest
  const manifest = {
    name: 'Please Sign Here - Animated Signature',
    short_name: 'Sign Here',
    description: 'Animated signature canvas with playback and export to PNG, GIF, SVG',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    orientation: 'any',
    icons
  };

  // Convert manifest to blob
  const manifestBlob = new Blob([JSON.stringify(manifest, null, 2)], {
    type: 'application/json'
  });

  const manifestURL = URL.createObjectURL(manifestBlob);

  // Update manifest link
  let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
  if (!manifestLink) {
    manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    document.head.appendChild(manifestLink);
  }
  manifestLink.href = manifestURL;
}

/**
 * Creates icon from a custom canvas (e.g., signature canvas)
 */
export function createIconFromCanvas(
  sourceCanvas: HTMLCanvasElement,
  size: number,
  backgroundColor = '#ffffff'
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, size, size);

  // Calculate scaling to fit source canvas into icon
  const padding = size * 0.1;
  const availableSize = size - padding * 2;
  const scale = Math.min(
    availableSize / sourceCanvas.width,
    availableSize / sourceCanvas.height
  );

  const scaledWidth = sourceCanvas.width * scale;
  const scaledHeight = sourceCanvas.height * scale;
  const x = (size - scaledWidth) / 2;
  const y = (size - scaledHeight) / 2;

  // Draw source canvas centered
  ctx.drawImage(sourceCanvas, x, y, scaledWidth, scaledHeight);

  return canvas;
}

/**
 * Updates manifest with icons from a custom canvas
 */
export async function updateManifestIconsFromCanvas(
  sourceCanvas: HTMLCanvasElement,
  backgroundColor = '#ffffff'
): Promise<void> {
  const sizes = [192, 512];
  const icons = sizes.map(size => {
    const iconCanvas = createIconFromCanvas(sourceCanvas, size, backgroundColor);
    return {
      src: iconCanvas.toDataURL('image/png'),
      sizes: `${size}x${size}`,
      type: 'image/png',
      purpose: 'any maskable'
    };
  });

  // Create dynamic manifest
  const manifest = {
    name: 'Please Sign Here - Animated Signature',
    short_name: 'Sign Here',
    description: 'Animated signature canvas with playback and export to PNG, GIF, SVG',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    orientation: 'any',
    icons
  };

  // Convert manifest to blob
  const manifestBlob = new Blob([JSON.stringify(manifest, null, 2)], {
    type: 'application/json'
  });

  const manifestURL = URL.createObjectURL(manifestBlob);

  // Update manifest link
  let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
  if (!manifestLink) {
    manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    document.head.appendChild(manifestLink);
  }

  // Revoke old URL if exists
  if (manifestLink.href.startsWith('blob:')) {
    URL.revokeObjectURL(manifestLink.href);
  }

  manifestLink.href = manifestURL;
}

/**
 * Initializes dynamic PWA icons
 */
export function initializePWAIcons(): void {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      updateManifestIcons();
    });
  } else {
    updateManifestIcons();
  }
}
