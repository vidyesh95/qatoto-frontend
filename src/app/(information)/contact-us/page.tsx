import ContactUs from "@/components/information/contact-us";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Contact Us page for Qatoto",
};

export default function ContactUsPage() {
  return <ContactUs />;
}
