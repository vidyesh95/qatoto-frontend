import PromoCarousel from "@/components/home/promo-carousel";
import Filter from "@/components/home/filter";
import AllContent from "@/components/home/all-content";

export default function Home() {
  return (
    <main>
      <PromoCarousel />
      <Filter />
      <AllContent />
    </main>
  );
}
