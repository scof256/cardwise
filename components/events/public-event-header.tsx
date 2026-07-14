import Link from "next/link";

export function PublicEventHeader() {
  return <header className="public-event-header"><Link className="public-event-brand" href="/"><span className="brand-mark"><i /><i /><i /></span><strong>cardwise</strong></Link><nav aria-label="Event navigation"><Link href="/events">Events</Link><Link href="/sign-in">Sign in</Link><Link className="public-event-cta" href="/onboarding">List an event</Link></nav></header>;
}
