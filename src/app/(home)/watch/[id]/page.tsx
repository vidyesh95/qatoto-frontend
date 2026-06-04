import WatchContent from "@/components/home/watch-content";

type Params = Promise<{ id: string }>;

export default async function WatchPage({ params }: { params: Params }) {
  const { id } = await params;
  return <WatchContent id={id} />;
}
