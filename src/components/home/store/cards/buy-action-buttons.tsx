// TRANSPORT: mock — cart / RFQ / checkout mutations land in later phases.

export default function BuyActionButtons() {
  return (
    <>
      <button
        type="button"
        disabled
        title="RFQ is not available yet"
        className="flex-1 rounded-full bg-background px-4 py-1.5 text-xs font-medium text-[#00696E] outline -outline-offset-1 outline-[#6F7979] disabled:opacity-50"
      >
        Send inquiry
      </button>
      <button
        type="button"
        disabled
        title="Cart is not available yet"
        className="flex-1 rounded-full bg-background px-4 py-1.5 text-xs font-medium text-[#00696E] outline -outline-offset-1 outline-[#6F7979] disabled:opacity-50"
      >
        Add to cart
      </button>
      <button
        type="button"
        disabled
        title="Checkout is not available yet"
        className="flex-1 rounded-full bg-[#00696E] px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50"
      >
        Buy now
      </button>
    </>
  );
}
