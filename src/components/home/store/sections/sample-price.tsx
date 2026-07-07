// Sample price row under the price chart. Lets a buyer order one unit at the
// sample rate before committing to a bulk order. UI-only mock — the sample
// price comes from the backend later, and "Get sample" starts that flow.

const SAMPLE_PRICE = "$1,410/set";

export default function SamplePrice() {
  return (
    <div className="flex items-center justify-between px-4 py-2 lg:px-6">
      <p className="text-sm text-[#191C1C]">
        Sample price: <span className="font-medium">{SAMPLE_PRICE}</span>
      </p>
      <button
        type="button"
        className="rounded-full bg-background px-4 py-1.5 text-xs font-medium text-[#00696E] outline -outline-offset-1 outline-[#6F7979]"
      >
        Get sample
      </button>
    </div>
  );
}
