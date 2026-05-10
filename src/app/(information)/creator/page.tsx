import Creator from "@/components/information/creator";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Creator | Qatoto',
  description: 'Creator page for Qatoto',
};


export default function CreatorPage() {
  return <Creator />;
}
