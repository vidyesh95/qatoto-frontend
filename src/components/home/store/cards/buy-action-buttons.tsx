// The three buy CTAs — rendered twice on the PDP: in the mobile/tablet fixed
// bottom bar and inline at the end of the desktop buy column. Keep classes
// identical between the two render sites.
export default function BuyActionButtons() {
  return (
    <>
      <button
        type="button"
        className="flex-1 rounded-full bg-background px-4 py-1.5 text-xs font-medium text-[#00696E] outline -outline-offset-1 outline-[#6F7979]"
      >
        Send inquiry
      </button>
      <button
        type="button"
        className="flex-1 rounded-full bg-background px-4 py-1.5 text-xs font-medium text-[#00696E] outline -outline-offset-1 outline-[#6F7979]"
      >
        Add to cart
      </button>
      <button
        type="button"
        className="flex-1 rounded-full bg-[#00696E] px-4 py-1.5 text-xs font-medium text-white"
      >
        Buy now
      </button>
    </>
  );
}
