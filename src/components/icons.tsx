import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

const base = (p: P) => ({
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...p,
});

/* Фирменный знак «Правового Статуса»: щит с весами правосудия */
export const LogoMark = (p: P) => (
  <svg {...base(p)} strokeWidth={1.5}>
    <path d="M12 2.3 20 5.1v6.2c0 5.2-3.3 8.9-8 10.4-4.7-1.5-8-5.2-8-10.4V5.1L12 2.3Z" />
    <path d="M12 6.6v9.6M9.4 16.2h5.2" />
    <path d="M7.2 8.6h9.6" />
    <path d="m7.2 8.6-1.9 3.7M7.2 8.6l1.9 3.7M5.1 12.3a2.1 2.1 0 0 0 4.2 0" />
    <path d="m16.8 8.6-1.9 3.7M16.8 8.6l1.9 3.7M14.7 12.3a2.1 2.1 0 0 0 4.2 0" />
  </svg>
);

export const IconRestart = (p: P) => (
  <svg {...base(p)}>
    <path d="M20 12a8 8 0 1 1-2.9-6.2" />
    <path d="M20 3.5V8h-4.5" />
  </svg>
);

export const IconRestartAll = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 5.5A8 8 0 0 1 19 8.2" />
    <path d="M19 4v4.5h-4.5" />
    <path d="M20 18.5A8 8 0 0 1 5 15.8" />
    <path d="M5 20v-4.5h4.5" />
  </svg>
);

/* Кассовый чек — блок привязки ККТ */
export const IconReceipt = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 3.5h12V18.6l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5V3.5Z" />
    <path d="M9 7.5h6M9 10.5h6M9 13.5h3.5" />
  </svg>
);

export const IconScan = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" />
    <path d="M3 12h18" />
  </svg>
);

export const IconPulse = (p: P) => (
  <svg {...base(p)}>
    <path d="M2.5 12h4l2.5-6.5L13.5 18l2.5-6h5.5" />
  </svg>
);

export const IconGear = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 2.8v2.6M12 18.6v2.6M4.1 7.4l2.2 1.3M17.7 15.3l2.2 1.3M2.8 12h2.6M18.6 12h2.6M4.1 16.6l2.2-1.3M17.7 8.7l2.2-1.3" />
  </svg>
);

export const IconTrayDown = (p: P) => (
  <svg {...base(p)}>
    <path d="M3.5 13.5v4.5A2.5 2.5 0 0 0 6 20.5h12a2.5 2.5 0 0 0 2.5-2.5v-4.5" />
    <path d="M3.5 13.5h4.6l1.4 2.3h5l1.4-2.3h4.6" />
    <path d="M12 3.5v7M9 8l3 3 3-3" />
  </svg>
);

export const IconTrayUp = (p: P) => (
  <svg {...base(p)}>
    <path d="M3.5 13.5v4.5A2.5 2.5 0 0 0 6 20.5h12a2.5 2.5 0 0 0 2.5-2.5v-4.5" />
    <path d="M3.5 13.5h4.6l1.4 2.3h5l1.4-2.3h4.6" />
    <path d="M12 10.5v-7M9 6l3-3 3 3" />
  </svg>
);

export const IconKey = (p: P) => (
  <svg {...base(p)}>
    <circle cx="8" cy="14.5" r="4" />
    <path d="m11 11.5 8-8M16 6.5l2.5 2.5M13.5 9l2 2" />
  </svg>
);

export const IconTerminal = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="4.5" width="18" height="15" rx="1.5" />
    <path d="m7 9.5 3 2.7-3 2.7M12.5 15.5H17" />
  </svg>
);

export const IconServer = (p: P) => (
  <svg {...base(p)}>
    <rect x="3.5" y="4" width="17" height="6.5" rx="1.2" />
    <rect x="3.5" y="13.5" width="17" height="6.5" rx="1.2" />
    <path d="M7 7.2h.01M7 16.8h.01M10.5 7.2h3M10.5 16.8h3" />
  </svg>
);

export const IconBroom = (p: P) => (
  <svg {...base(p)}>
    <path d="m19.5 4.5-6.8 6.8" />
    <path d="M12.7 11.3 9 9.8 4.5 17.4c2.3 1.9 5.1 2.6 7.9 1.9l2.4-5.5-2.1-2.5Z" />
    <path d="M10.5 15.5 8 18" />
  </svg>
);

export const IconRadio = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="2" />
    <path d="M7.8 16.2a6 6 0 0 1 0-8.4M16.2 7.8a6 6 0 0 1 0 8.4" />
    <path d="M5 19a10 10 0 0 1 0-14M19 5a10 10 0 0 1 0 14" />
  </svg>
);

export const IconWarnTriangle = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3.6 21.5 20h-19L12 3.6Z" />
    <path d="M12 9.5v4.5M12 17.2h.01" />
  </svg>
);

export const IconCheckCircle = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m8.2 12.3 2.6 2.7 5-5.4" />
  </svg>
);

export const IconXCircle = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m9.2 9.2 5.6 5.6M14.8 9.2l-5.6 5.6" />
  </svg>
);

export const IconInfoDot = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5M12 8h.01" />
  </svg>
);

export const IconZap = (p: P) => (
  <svg {...base(p)}>
    <path d="M13 2.5 5 13.5h5.5L10 21.5l8-11h-5.5L13 2.5Z" />
  </svg>
);

export const IconDownload = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3.5v10M8.5 10l3.5 3.5L15.5 10" />
    <path d="M4.5 15.5v3A2 2 0 0 0 6.5 20.5h11a2 2 0 0 0 2-2v-3" />
  </svg>
);

export const IconExternalLink = (p: P) => (
  <svg {...base(p)}>
    <path d="M10 5H6.5A2.5 2.5 0 0 0 4 7.5v10A2.5 2.5 0 0 0 6.5 20h10a2.5 2.5 0 0 0 2.5-2.5V14" />
    <path d="M13.5 4H20v6.5M20 4l-9 9" />
  </svg>
);

export const IconCopy = (p: P) => (
  <svg {...base(p)}>
    <rect x="8.5" y="8.5" width="12" height="12" rx="1.5" />
    <path d="M15.5 8.5v-4A1.5 1.5 0 0 0 14 3H5A1.5 1.5 0 0 0 3.5 4.5v9A1.5 1.5 0 0 0 5 15h3.5" />
  </svg>
);

export const IconCli = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="4.5" width="18" height="15" rx="1.5" />
    <path d="m7 9.5 3 2.7-3 2.7M12.5 15.5H17" />
  </svg>
);

export const IconFileCode = (p: P) => (
  <svg {...base(p)}>
    <path d="M13.5 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5L13.5 3Z" />
    <path d="M13.5 3v5.5H19" />
    <path d="m10 12.5-2 2 2 2M14 12.5l2 2-2 2" />
  </svg>
);
