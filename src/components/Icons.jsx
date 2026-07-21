const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

function Svg({ size = 18, children, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...rest}>
      {children}
    </svg>
  )
}

export const IconDashboard = (p) => (
  <Svg {...p}>
    <rect x="3" y="3" width="7.5" height="9" rx="1.8" />
    <rect x="13.5" y="3" width="7.5" height="5.5" rx="1.8" />
    <rect x="13.5" y="11" width="7.5" height="10" rx="1.8" />
    <rect x="3" y="14.5" width="7.5" height="6.5" rx="1.8" />
  </Svg>
)

export const IconUsers = (p) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 20c0-3.4 2.6-5.8 5.5-5.8s5.5 2.4 5.5 5.8" />
    <circle cx="17" cy="7.5" r="2.4" />
    <path d="M15.3 14.5c2.4.3 4.2 2.4 4.2 5" />
  </Svg>
)

export const IconTransactions = (p) => (
  <Svg {...p}>
    <rect x="2.5" y="5" width="19" height="14" rx="2.4" />
    <path d="M2.5 10h19" />
    <path d="M6 14.5h4" />
  </Svg>
)

export const IconHistory = (p) => (
  <Svg {...p}>
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v4.5H7.5" />
    <path d="M12 7.5V12l3 2" />
  </Svg>
)

export const IconSearch = (p) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </Svg>
)

export const IconBell = (p) => (
  <Svg {...p}>
    <path d="M5.5 16V10a6.5 6.5 0 0 1 13 0v6l1.8 2.6H3.7z" />
    <path d="M9.5 20a2.5 2.5 0 0 0 5 0" />
  </Svg>
)

export const IconChevronDown = (p) => (
  <Svg {...p}>
    <path d="M5.5 8.5L12 15l6.5-6.5" />
  </Svg>
)

export const IconArrowUp = (p) => (
  <Svg {...p}>
    <path d="M12 19V5" />
    <path d="M5.5 11.5L12 5l6.5 6.5" />
  </Svg>
)

export const IconArrowDown = (p) => (
  <Svg {...p}>
    <path d="M12 5v14" />
    <path d="M18.5 12.5L12 19l-6.5-6.5" />
  </Svg>
)

export const IconMenu = (p) => (
  <Svg {...p}>
    <path d="M4 7h16" />
    <path d="M4 12h16" />
    <path d="M4 17h16" />
  </Svg>
)

export const IconLeaf = (p) => (
  <Svg {...p}>
    <path d="M5 19c9 0 14-5 14-14-9 0-14 5-14 14z" />
    <path d="M5 19c3-6 6-9 11-11.5" />
  </Svg>
)

export const IconRupee = (p) => (
  <Svg {...p}>
    <path d="M6 3h12" />
    <path d="M6 8h12" />
    <path d="M6 13h3c3.5 0 6-2 6-5" />
    <path d="m6 13 8.5 8" />
  </Svg>
)

export const IconBag = (p) => (
  <Svg {...p}>
    <path d="M6 8h12l1 12.5H5z" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </Svg>
)

export const IconRefund = (p) => (
  <Svg {...p}>
    <path d="M3 12a9 9 0 1 1 2.6 6.3" />
    <path d="M3 21v-5h5" />
  </Svg>
)

export const IconAlert = (p) => (
  <Svg {...p}>
    <path d="M12 3.5 22 20.5H2z" />
    <path d="M12 10v4.2" />
    <circle cx="12" cy="17.3" r="0.15" fill="currentColor" stroke="none" />
  </Svg>
)

export const IconCard = (p) => (
  <Svg {...p}>
    <rect x="2.5" y="5.5" width="19" height="13" rx="2.2" />
    <path d="M2.5 10h19" />
  </Svg>
)

export const IconUserPlus = (p) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 20c0-3.4 2.7-5.8 6-5.8s6 2.4 6 5.8" />
    <path d="M18.5 8v5" />
    <path d="M16 10.5h5" />
  </Svg>
)

export const IconFilter = (p) => (
  <Svg {...p}>
    <path d="M4 5h16" />
    <path d="M7 12h10" />
    <path d="M10.3 19h3.4" />
  </Svg>
)

export const IconMore = (p) => (
  <Svg {...p}>
    <circle cx="5" cy="12" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="19" cy="12" r="1.1" fill="currentColor" stroke="none" />
  </Svg>
)

export const IconX = (p) => (
  <Svg {...p}>
    <path d="M6 6l12 12" />
    <path d="M18 6L6 18" />
  </Svg>
)

export const IconSun = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.5v2.4" />
    <path d="M12 19.1v2.4" />
    <path d="M4.6 4.6l1.7 1.7" />
    <path d="M17.7 17.7l1.7 1.7" />
    <path d="M2.5 12h2.4" />
    <path d="M19.1 12h2.4" />
    <path d="M4.6 19.4l1.7-1.7" />
    <path d="M17.7 6.3l1.7-1.7" />
  </Svg>
)

export const IconMoon = (p) => (
  <Svg {...p}>
    <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" />
  </Svg>
)
