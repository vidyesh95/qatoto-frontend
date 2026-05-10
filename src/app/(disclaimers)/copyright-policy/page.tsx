import CopyrightPolicy from "@/components/disclaimers/copyright-policy";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Copyright Policy | Qatoto',
  description: 'Copyright Policy page for Qatoto',
};


export default function CopyrightPolicyPage() {
  return <CopyrightPolicy />;
}
