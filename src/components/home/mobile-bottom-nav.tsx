"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

// Bottom tab bar shown only on mobile (md:hidden). Mirrors the five primary
// product surfaces from the desktop sidebar's COLLAPSED_NAV_CONFIG. Active item
// gets a filled icon inside a teal pill, matching the collapsed-sidebar style.
const NAV_ITEMS = [
 {
   href: "/",
   label: "Home",
   activeIcon: "/icons/home_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
   inactiveIcon: "/icons/home_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
 },
 {
   href: "/anime",
   label: "Anime",
   activeIcon: "/icons/live_tv_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
   inactiveIcon: "/icons/live_tv_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
 },
 {
   href: "/create",
   label: "Create",
   activeIcon: "/icons/video_call_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
   inactiveIcon: "/icons/video_call_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
 },
 {
   href: "/store",
   label: "Store",
   activeIcon: "/icons/local_mall_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
   inactiveIcon: "/icons/local_mall_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
 },
 {
   href: "/ai",
   label: "AI",
   activeIcon: "/icons/video_template_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg",
   inactiveIcon: "/icons/video_template_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
 },
] as const;


export default function MobileBottomNav() {
 const pathname = usePathname();


 return (
   <nav
     aria-label="Primary"
     className="fixed inset-x-0 bottom-0 z-50 flex items-stretch justify-around gap-2 bg-background px-2 pb-[env(safe-area-inset-bottom)] md:hidden"
   >
     {NAV_ITEMS.map((item) => {
       const isActive = pathname === item.href;
       return (
         <Link
           key={item.href}
           href={item.href}
           aria-current={isActive ? "page" : undefined}
           className="flex flex-1 flex-col items-center gap-1 pt-3 pb-4 text-xs tracking-[0.5px]"
         >
           <span
             className={`flex h-8 w-16 items-center justify-center rounded-full transition-colors ${
               isActive ? "bg-primary" : ""
             }`}
           >
             <Image
               src={isActive ? item.activeIcon : item.inactiveIcon}
               width={24}
               height={24}
               alt=""
             />
           </span>
           <span className={`font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
             {item.label}
           </span>
         </Link>
       );
     })}
   </nav>
 );
}
