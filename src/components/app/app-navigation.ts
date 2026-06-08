export type AppNavigationItem = {
  label: string;
  href: string;
  marker: string;
};

export const appNavigationItems: AppNavigationItem[] = [
  { label: "Dashboard", href: "/app", marker: "D" },
  { label: "Playlists", href: "/app/playlists", marker: "P" },
  { label: "Library", href: "/app/library", marker: "L" },
  { label: "Sorts", href: "/app/sorts", marker: "S" },
  { label: "Settings", href: "/app/settings/libraries", marker: "T" }
];

export function isAppNavigationItemActive(href: string, pathname: string | null) {
  if (!pathname) {
    return false;
  }

  if (href === "/app") {
    return pathname === "/app" || pathname === "/dashboard";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
