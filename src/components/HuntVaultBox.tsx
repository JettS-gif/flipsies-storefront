import { BED_DEALS_ANCHOR } from '@/lib/bedDeals';

// The radio hunt's bed-sign stop, at the very top of /deals (Jett 2026-11-20: a scan should land on it
// first). While the hunt is open it takes the #beds anchor the printed QR jumps to, so the jump lands
// here rather than past it. Before noon on hunt day it says where the PIN will appear; 12:00–16:00 it
// shows the scrambled PIN. Delete after the event.
export default function HuntVaultBox({ pin }: { pin: string | null }) {
  return (
    <div
      id={BED_DEALS_ANCHOR}
      role="status"
      className="scroll-mt-28 mb-10 rounded-xl border-2 border-brand-yellow bg-brand-yellow-light px-5 py-4 text-brand-charcoal"
    >
      <p className="text-sm font-semibold uppercase tracking-wider text-brand-yellow-dark">
        Scavenger hunt players
      </p>
      {pin ? (
        <p className="mt-1 text-lg">
          The Hoover vault PIN is scrambled:{' '}
          <strong className="tracking-widest">{pin.split('').join(' ')}</strong>. Hint: it&rsquo;s what you hit
          when the alarm goes off on a bed this comfortable. Unscramble it, tell the word to the Vault Keeper at
          the bed display, and show your Card A.
        </p>
      ) : (
        <p className="mt-1 text-lg">
          You&rsquo;re in the right place. The Hoover vault PIN appears right here on Saturday, Nov 21, from noon.
          Clue 2 airs at 1:00. Rules and sign-up at{' '}
          <a href="/hunt" className="underline font-semibold">flipsiesfurniture.com/hunt</a>.
        </p>
      )}
    </div>
  );
}
