"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

interface CreateMenuProps {
  onClose: () => void;
}

interface CreateMenuItem {
  label: string;
  iconSrc: string;
}

const CREATE_MENU_ITEMS: CreateMenuItem[] = [
  {
    label: "Upload videos",
    iconSrc: "/icons/upload_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
  },
  {
    label: "Go live",
    iconSrc: "/icons/live_tv_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  {
    label: "New playlist",
    iconSrc: "/icons/playlist_add_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  {
    label: "Add product",
    iconSrc: "/icons/package_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
];

/**
 * Dropdown listing the creation actions (upload, go live, playlist, product),
 * anchored below the navbar's Create button. Presentational only for now —
 * picking an item just closes the menu.
 *
 * Closes itself when the user presses down outside the anchor (the wrapper
 * holding both the Create button and this panel), so clicking the Create
 * button again toggles the menu closed instead of instantly reopening it.
 */
export default function CreateMenu({ onClose }: CreateMenuProps) {
  const menuPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (mouseEvent: MouseEvent) => {
      const clickTarget = mouseEvent.target;
      const menuAnchorElement = menuPanelRef.current?.parentElement;
      const clickedOutsideAnchor =
        clickTarget instanceof Node &&
        menuAnchorElement &&
        !menuAnchorElement.contains(clickTarget);

      if (clickedOutsideAnchor) onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={menuPanelRef}
      role="menu"
      className="absolute top-12 right-0 z-50 w-56 rounded-lg border border-black/10 bg-background py-2 shadow-lg"
    >
      {CREATE_MENU_ITEMS.map((menuItem) => (
        <button
          key={menuItem.label}
          type="button"
          role="menuitem"
          onClick={onClose}
          className="flex w-full cursor-pointer flex-row items-center gap-4 px-4 py-3 transition-colors hover:bg-muted"
        >
          <Image src={menuItem.iconSrc} alt="" width={24} height={24} />
          <span className="text-sm font-medium text-secondary-foreground">{menuItem.label}</span>
        </button>
      ))}
    </div>
  );
}
