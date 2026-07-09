import { themeAbyss, DockviewTheme } from 'dockview-react';

export const customTheme: DockviewTheme = {
  ...themeAbyss,
  gap: 4,
  tabGroupIndicator: 'wrap',
  tabAnimation: 'smooth',
};

// Apply to the div wrapping <DockviewReact>:
const cssOverrides = {
  '--dv-drag-over-background-color': '#5ee9b55d',
  '--dv-floating-group-dragging-opacity': '0.15',
  '--dv-spacing-padding': '0px',
  '--dv-tabs-and-actions-container-height': '26px',
  '--dv-tabs-and-actions-container-font-size': '12px',
  '--dv-border-radius': '4px',
  '--dv-tab-border-radius': '10px',
  '--dv-sash-border-radius': '10px',
  '--dv-group-view-background-color': '#090b0c',
  '--dv-tabs-and-actions-container-background-color': '#ffffff1a',
  '--dv-separator-border': '#22292b',
  '--dv-activegroup-visiblepanel-tab-background-color': '#161b1d',
} as React.CSSProperties;
