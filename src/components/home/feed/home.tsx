import PromoCarousel from "@/components/home/feed/promo-carousel";
import Filter from "@/components/home/feed/filter";
import AllContent from "@/components/home/feed/all-content";

export default function Home() {
  return (
    <main>
      <PromoCarousel />
      <Filter />
      <AllContent />
    </main>
  );
}
