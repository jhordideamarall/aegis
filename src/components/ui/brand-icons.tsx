import * as React from "react"

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string
  strokeWidth?: number | string
}

export const InstagramIcon = ({ size = 18, strokeWidth = 2, ...props }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
)

export const ShopeeIcon = ({ size = 18, ...props }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <path d="M18.15 6.82h-3.41c-.07-2.31-1-4.47-2.61-6.07C10.53-.86 8.31-.86 6.71.75 5.1 2.35 4.17 4.51 4.1 6.82H.69c-.4 0-.78.22-1 .6-.22.38-.22.84 0 1.22l2.67 4.67c.07.12.16.22.27.3.1.08.22.13.35.13h.1l-.8 8.08c-.04.42.13.84.45 1.13.32.29.74.4 1.15.3l14.15-2.82c.41-.08.75-.36.91-.74.16-.38.12-.8-.11-1.13l-2.67-4c-.1-.15-.24-.26-.41-.31-.17-.05-.34-.05-.51 0l-5.63 1.88 5.63-8.45c.23-.34.27-.76.11-1.14s-.5-.66-.91-.74l-6.19-.62 6.19-1.24c.42-.08.75-.36.91-.74.16-.38.12-.8-.11-1.13L18.15 6.82zM7.56 1.6c1.17-1.17 2.82-1.17 3.99 0 1.17 1.17 1.85 2.73 1.9 4.39l-7.79.78C5.71 4.33 6.39 2.77 7.56 1.6z" />
  </svg>
)

export const TikTokIcon = ({ size = 18, ...props }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <path d="M12.525.02c1.31 0 2.59.18 3.82.52.01 1.71.55 3.32 1.54 4.64.99 1.32 2.35 2.33 3.89 2.87v4.44a11.96 11.96 0 0 1-5.43-1.32v8.27c0 1.5-.4 2.92-1.11 4.14a8.91 8.91 0 0 1-3.03 3.03 8.91 8.91 0 0 1-4.14 1.11 8.91 8.91 0 0 1-4.14-1.11 8.91 8.91 0 0 1-3.03-3.03A8.91 8.91 0 0 1 0 16.44c0-1.5.4-2.92 1.11-4.14a8.91 8.91 0 0 1 3.03-3.03A8.91 8.91 0 0 1 8.28 8.16a8.88 8.88 0 0 1 2.35.31V0h1.895z" />
  </svg>
)
