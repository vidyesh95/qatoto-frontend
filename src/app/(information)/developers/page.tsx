import Developers from "@/components/information/developers";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Developers | Qatoto',
  description: 'Developers page for Qatoto',
};


export default function DevelopersPage() {
  return <Developers />;
}
