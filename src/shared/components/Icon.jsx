import React from "react";

const ICON_PATHS = {
  alert:
    '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" />',
  arrowL: '<path d="m12 19-7-7 7-7" /><path d="M19 12H5" />',
  arrowR: '<path d="M5 12h14" /><path d="m12 5 7 7-7 7" />',
  battery:
    '<rect x="2" y="7" width="16" height="10" rx="2" /><path d="M22 11v2" /><path d="M6 11h6" />',
  bell:
    '<path d="M10.27 21a2 2 0 0 0 3.46 0" /><path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />',
  bolt: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" />',
  briefcase:
    '<rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /><path d="M2 13h20" /><path d="M12 12v2" />',
  building:
    '<path d="M3 21h18" /><path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16" /><path d="M19 21V9a2 2 0 0 0-2-2h-2" /><path d="M9 7h1" /><path d="M9 11h1" /><path d="M9 15h1" />',
  check: '<path d="m20 6-11 11-5-5" />',
  chevronD: '<path d="m6 9 6 6 6-6" />',
  chevronR: '<path d="m9 18 6-6-6-6" />',
  copy:
    '<rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />',
  dot: '<circle cx="12" cy="12" r="1" />',
  download:
    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" />',
  fileText:
    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /><path d="M16 13H8" /><path d="M16 17H8" /><path d="M10 9H8" />',
  frame:
    '<path d="M4 5h16" /><path d="M4 19h16" /><path d="M5 5v14" /><path d="M19 5v14" /><path d="m8 5 8 14" /><path d="m16 5-8 14" />',
  info:
    '<circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />',
  line:
    '<path d="M4 19 20 5" /><path d="M7 16l-3-3" /><path d="m10 13-3-3" /><path d="m13 10-3-3" /><path d="m16 7-3-3" />',
  logout:
    '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" />',
  map:
    '<path d="m14.5 4.5-5 2-6-2v15l6 2 5-2 6 2v-15l-6-2Z" /><path d="M9.5 6.5v15" /><path d="M14.5 4.5v15" />',
  moon:
    '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />',
  paperclip:
    '<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />',
  plus: '<path d="M5 12h14" /><path d="M12 5v14" />',
  search:
    '<circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />',
  settings:
    '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.5a2 2 0 0 1-1 1.72l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.72v-.5a2 2 0 0 1 1-1.72l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z" /><circle cx="12" cy="12" r="3" />',
  shield:
    '<path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3v8Z" />',
  sliders:
    '<path d="M4 21v-7" /><path d="M4 10V3" /><path d="M12 21v-9" /><path d="M12 8V3" /><path d="M20 21v-5" /><path d="M20 12V3" /><path d="M2 14h4" /><path d="M10 8h4" /><path d="M18 16h4" />',
  sun:
    '<circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />',
  tower:
    '<path d="M12 3v18" /><path d="m5 21 7-18 7 18" /><path d="M7.5 14h9" /><path d="M9 9h6" />',
  upload:
    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M17 8l-5-5-5 5" /><path d="M12 3v12" />',
  x: '<path d="M18 6 6 18" /><path d="m6 6 12 12" />',
  zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" />',
};

export default function Icon({
  name,
  size = 18,
  stroke = 2,
  className = "",
  style = {},
}) {
  const path = ICON_PATHS[name] || ICON_PATHS.dot;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{
        flex: "none",
        ...style,
      }}
      dangerouslySetInnerHTML={{ __html: path }}
    />
  );
}
