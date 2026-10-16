/**
 * The account menu's dropdown frame: position, size and surface.
 *
 * A MODULE OF ITS OWN, WITH NO DIRECTIVE AND NO IMPORTS, because two components draw this frame —
 * `account-menu.tsx`, and the load-failure panel in `lazy-account-menus.tsx` that stands in for it
 * when the menu's chunk cannot be fetched. The second one must not import the first, or the menu
 * would be back in every `(home)` page's initial JavaScript, which is the whole reason it is lazy.
 */
export const ACCOUNT_MENU_PANEL_CLASS_NAME =
  "fixed top-15 right-14 left-1 z-50 max-h-[calc(100dvh-9rem)] w-auto overflow-y-auto rounded-lg border border-border bg-background shadow-lg sm:absolute sm:top-12 sm:right-2 sm:left-auto sm:max-h-[calc(100dvh-4rem)] sm:w-95";
