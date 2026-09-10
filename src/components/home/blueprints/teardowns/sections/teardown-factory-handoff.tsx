// TRANSPORT: props-only — it renders one link and reads nothing.

import Link from "next/link";

/**
 * The one place this surface hands off to the rest of the pipeline.
 *
 * A teardown answers "can I make this, and what would it cost". The next question is "who makes
 * it", and Qatoto already has an answer: `/store/factories` is a live, wired directory with a real
 * inquiry flow behind it (`/store/factories/[factorySlug]/inquire`). PRODUCT.md ranks continuity
 * over polish and Principle 5 says a rough stage that hands off correctly outranks a refined one
 * that dead-ends — a teardown page that stops at the files is the dead end.
 *
 * ⚠️ IT LINKS TO THE DIRECTORY WITH NO DERIVED QUERY, AND THAT IS DELIBERATE.
 * `TEARDOWN_MANUFACTURING_METHODS` (`cnc_milled`, `injection_molded`, `pcb_assembly`, …) and
 * `FACTORY_CAPABILITY_KINDS` (`odm`, `oem`, `tooling_and_moulds`, `contract_manufacturing`, …)
 * look adjacent and answer different questions: one is the process a PART was made by, the other
 * is the commercial relationship a FACTORY offers. `injection_molded` is not `tooling_and_moulds`
 * — a shop that cuts the mould and a shop that runs it are frequently not the same business.
 * Mapping one onto the other would ship a wrong filter dressed up as a smart one, and a reader who
 * trusted it would conclude nobody can make their part.
 *
 * ⚠️ THE COPY PROMISES NOTHING QATOTO DOES NOT DO. No quote, no price, no timeline, and no
 * suggestion that this teardown's published files can be sent to a factory — they are somebody
 * else's drawings of somebody else's product. "Your own files" is doing real work in that sentence.
 *
 * IT RENDERS ON EVERY TEARDOWN, including one that published no files at all. The handoff is about
 * the pipeline rather than about this row's payload, and a teardown with nothing attached is
 * exactly the case where a reader most needs telling where to go next.
 *
 * NOT A BORDERED PANEL. `docs/Design.md` §4 forbids a bordered panel inside a bordered panel and
 * this sits among sections that already carry hairlines; a heading, a line and a link say the same
 * thing without adding a box.
 */
export default function TeardownFactoryHandoff() {
  return (
    <section className="mt-8 max-w-2xl">
      <h2 className="text-sm font-medium text-foreground">Getting it made</h2>
      <p className="mt-2 text-sm leading-6 text-[#6F7979]">
        Qatoto lists factories by capability and certification and carries an inquiry to them.
        Nothing here is a quote, and a factory will ask for your own files.
      </p>
      <Link
        href="/store/factories"
        className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-[#00696E] transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E]"
      >
        Browse the factory directory
        <span aria-hidden="true">&rarr;</span>
      </Link>
    </section>
  );
}
