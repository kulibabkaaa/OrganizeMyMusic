export type AppNavigationItem = {
  label: string;
  href: string;
  marker: string;
};

export const appNavigationItems: AppNavigationItem[] = [
  { label: "Dashboard", href: "/app", marker: "D" },
  { label: "Sorts", href: "/app/sorts", marker: "S" },
  { label: "Library", href: "/app/library", marker: "L" },
  { label: "Billing", href: "/app/billing", marker: "B" },
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
