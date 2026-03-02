/**
 * VapeHaven Icon Library
 * A collection of SVG icons for the premium dark-themed vape e-commerce site
 * All icons use stroke-based design (1.5px) for consistency with the brand aesthetic
 */

const VH_ICONS = {
  // Navigation Icons
  bag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M9 2h6v3H9V2z"/>
    <path d="M20 9H4v11c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V9z"/>
    <path d="M9 13v4m6-4v4"/>
  </svg>`,

  menu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>`,

  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>`,

  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>`,

  user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="8" r="4"/>
    <path d="M6 20c0-3.314 2.686-6 6-6s6 2.686 6 6"/>
  </svg>`,

  arrowLeft: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/>
    <polyline points="12 19 5 12 12 5"/>
  </svg>`,

  arrowRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/>
    <polyline points="12 5 19 12 12 19"/>
  </svg>`,

  chevronDown: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>`,

  // Product Specs Icons
  puffs: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M5 11c0-1.657 1.343-3 3-3s3 1.343 3 3"/>
    <path d="M13 8c0-1.657 1.343-3 3-3s3 1.343 3 3"/>
    <path d="M9 15c0-1.657 1.343-3 3-3s3 1.343 3 3"/>
    <path d="M6 19c0-1.104.896-2 2-2s2 .896 2 2"/>
    <path d="M14 19c0-1.104.896-2 2-2s2 .896 2 2"/>
  </svg>`,

  battery: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="7" width="16" height="10" rx="2"/>
    <line x1="22" y1="11" x2="22" y2="13"/>
    <line x1="6" y1="10" x2="12" y2="10"/>
    <line x1="6" y1="14" x2="12" y2="14"/>
  </svg>`,

  coil: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M5 9c0-1 .5-2 1.5-2s1.5 1 1.5 2v2c0 1 .5 2 1.5 2s1.5-1 1.5-2v2c0 1 .5 2 1.5 2s1.5-1 1.5-2v2c0 1 .5 2 1.5 2s1.5-1 1.5-2"/>
    <line x1="5" y1="3" x2="5" y2="21"/>
    <line x1="19" y1="3" x2="19" y2="21"/>
  </svg>`,

  capacity: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 2c-1.657 0-3 1.343-3 3h6c0-1.657-1.343-3-3-3z"/>
    <path d="M6 5h12v13c0 2.209-1.791 4-4 4h-4c-2.209 0-4-1.791-4-4V5z"/>
    <path d="M9 12c0-1.657 1.343-3 3-3s3 1.343 3 3"/>
  </svg>`,

  display: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/>
    <path d="M8 21h8M12 17v4"/>
    <line x1="6" y1="7" x2="18" y2="7"/>
    <line x1="6" y1="11" x2="18" y2="11"/>
  </svg>`,

  dimensions: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 3h18M3 3v18M21 3v18M21 21H3"/>
    <line x1="6" y1="3" x2="6" y2="1"/>
    <line x1="6" y1="23" x2="6" y2="21"/>
    <line x1="3" y1="6" x2="1" y2="6"/>
    <line x1="23" y1="6" x2="21" y2="6"/>
  </svg>`,

  // Checkout & Payment Icons
  creditCard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2"/>
    <line x1="1" y1="10" x2="23" y2="10"/>
    <line x1="5" y1="16" x2="8" y2="16"/>
  </svg>`,

  lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11V7c0-2.761 2.239-5 5-5s5 2.239 5 5v4"/>
    <line x1="12" y1="15" x2="12" y2="19"/>
  </svg>`,

  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 2l-8 4v6c0 6 8 8 8 8s8-2 8-8V6l-8-4z"/>
    <polyline points="8 12 11 15 16 9"/>
  </svg>`,

  truck: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="1" y="3" width="15" height="13"/>
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
    <circle cx="5.5" cy="18.5" r="2.5"/>
    <circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>`,

  checkCircle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="8 12 11 15 16 9"/>
  </svg>`,

  alertCircle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>`,

  // Cart & UI Icons
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>`,

  minus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>`,

  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
    <line x1="10" y1="11" x2="10" y2="17"/>
    <line x1="14" y1="11" x2="14" y2="17"/>
  </svg>`,

  heart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>`,

  filter: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M22 3H2l8 9.46V19l6 2v-8.54L22 3z"/>
  </svg>`,

  star: `<svg viewBox="-1 0 26 26" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="12 2 15.09 10.26 23.77 11.36 17.88 17.15 19.24 25.88 12 21.77 4.76 25.88 6.12 17.15 0.23 11.36 8.91 10.26 12 2"/>
  </svg>`,

  spinner: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <path d="M21 12c0-5-4-9-9-9"/>
  </svg>`,

  package: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12.89 1.45l8 4A2 2 0 0 1 22 7.24v9.53a2 2 0 0 1-1.11 1.79l-8 4a2 2 0 0 1-1.79 0l-8-4A2 2 0 0 1 2 16.76V7.24a2 2 0 0 1 1.11-1.79l8-4a2 2 0 0 1 1.78 0z"/>
    <polyline points="2.32 6.16 12 11 21.68 6.16"/>
    <line x1="12" y1="22.76" x2="12" y2="11"/>
  </svg>`,

  mapPin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>`,

  mail: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="M22 6L12 13 2 6"/>
  </svg>`,

  phone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>`,

  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>`,

  // Social Icons
  instagram: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <circle cx="17.5" cy="6.5" r="1.5"/>
  </svg>`,

  facebook: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 2h-3a6 6 0 0 0-6 6v3H7v4h2v8h4v-8h3l1-4h-4V8a2 2 0 0 1 2-2h1z"/>
  </svg>`,

  twitter: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2s9 5 20 5a9.5 9.5 0 0 0-9-5.5c4.75 2.25 7-7 7-7"/>
  </svg>`
};

/**
 * Create an HTML span element containing an SVG icon
 * @param {string} name - The name of the icon (key in VH_ICONS)
 * @param {number} size - The size in pixels (default: 20)
 * @param {string} className - Additional CSS classes to apply to the span
 * @returns {HTMLElement} A span element containing the SVG
 */
function createIcon(name, size = 20, className = '') {
  if (!VH_ICONS[name]) {
    console.warn(`Icon "${name}" not found in VH_ICONS`);
    return document.createElement('span');
  }

  const span = document.createElement('span');
  span.className = `vh-icon vh-icon-${name} ${className}`.trim();
  span.style.display = 'inline-flex';
  span.style.alignItems = 'center';
  span.style.justifyContent = 'center';
  span.style.width = `${size}px`;
  span.style.height = `${size}px`;
  span.style.flexShrink = '0';
  span.innerHTML = VH_ICONS[name];

  return span;
}

/**
 * Find all elements with data-icon attribute and inject corresponding SVG icons
 * Supports data-icon="iconName" and optional data-icon-size="20" attributes
 * Example: <div data-icon="search" data-icon-size="24"></div>
 */
function injectIcons() {
  const elements = document.querySelectorAll('[data-icon]');

  elements.forEach(element => {
    const iconName = element.getAttribute('data-icon');
    const iconSize = parseInt(element.getAttribute('data-icon-size')) || 20;
    const iconClass = element.getAttribute('data-icon-class') || '';

    if (!VH_ICONS[iconName]) {
      console.warn(`Icon "${iconName}" not found in VH_ICONS`);
      return;
    }

    const icon = createIcon(iconName, iconSize, iconClass);
    element.innerHTML = '';
    element.appendChild(icon);
  });
}

// Export to window object
window.VH_ICONS = VH_ICONS;
window.createIcon = createIcon;
window.injectIcons = injectIcons;

// Auto-inject icons on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectIcons);
} else {
  injectIcons();
}
