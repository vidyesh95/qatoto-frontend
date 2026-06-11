import type { Metadata } from "next";
import StorePage from "@/components/home/store/store-page";

export const metadata: Metadata = {
  title: "Store",
  description: "B2B commerce store for Qatoto",
};

export default function Store() {
  return <StorePage />;
}
