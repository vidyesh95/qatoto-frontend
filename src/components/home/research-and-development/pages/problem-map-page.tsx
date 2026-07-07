import ProblemMapCanvas from "@/components/home/research-and-development/sections/problem-map-canvas";

// Problem Map (Civic Pulse) page body. Server shell — every piece of
// interaction state lives in the ProblemMapCanvas client island below.
export default function ProblemMapPage() {
  return (
    <div className="space-y-6 px-4 pb-8 lg:px-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold md:text-3xl">Problem Map</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Civic Pulse — reported infrastructure gaps, mapped into opportunity.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Reports you add here are session-local during the mock phase and reset on refresh.
        </p>
      </div>
      <ProblemMapCanvas />
    </div>
  );
}
