/**
 * Data-broker / people-search registry.
 *
 * The "build" half of the hybrid broker strategy: rather than scrape each broker
 * directly (their anti-bot defenses block server fetches, and there's no broker
 * API), we detect a person's broker listings inside the LIVE Google results we
 * already fetch — any result whose domain is a known people-search site is a
 * real broker exposure. Detection is live; removal stays a paid-plan/partner
 * capability (Optery/Onerep). Pure + unit-tested.
 */

/** Top people-search / data-broker domains → display name. Highest-exposure first. */
export const DATA_BROKERS: Record<string, string> = {
  "spokeo.com": "Spokeo",
  "whitepages.com": "Whitepages",
  "beenverified.com": "BeenVerified",
  "radaris.com": "Radaris",
  "peoplefinders.com": "PeopleFinders",
  "truepeoplesearch.com": "TruePeopleSearch",
  "fastpeoplesearch.com": "FastPeopleSearch",
  "intelius.com": "Intelius",
  "mylife.com": "MyLife",
  "instantcheckmate.com": "Instant Checkmate",
  "truthfinder.com": "TruthFinder",
  "usphonebook.com": "USPhoneBook",
  "nuwber.com": "Nuwber",
  "clustrmaps.com": "ClustrMaps",
  "peekyou.com": "PeekYou",
  "thatsthem.com": "ThatsThem",
  "advancedbackgroundchecks.com": "Advanced Background Checks",
  "searchpeoplefree.com": "SearchPeopleFree",
  "addresses.com": "Addresses.com",
  "veripages.com": "VeriPages",
};

/** Match a hostname to a known broker (handles www. + subdomains), or null. */
export function brokerForDomain(domain: string): string | null {
  const host = (domain || "").toLowerCase().trim().replace(/^www\./, "");
  for (const [d, name] of Object.entries(DATA_BROKERS)) {
    if (host === d || host.endsWith(`.${d}`)) return name;
  }
  return null;
}
