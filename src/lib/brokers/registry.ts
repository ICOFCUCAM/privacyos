/**
 * Data-broker registry.
 *
 * Catalog of supported brokers and how PrivacyOS opts a subject out of each. In
 * production every entry carries the concrete opt-out mechanism (form fields,
 * email template, or API); here the metadata is real and the submission is
 * simulated by the workflow engine. Designed to scale to hundreds of brokers.
 */

export type OptOutMethod = "form" | "email" | "api";

export interface Broker {
  id: string;
  name: string;
  category: string;
  method: OptOutMethod;
  optOutUrl?: string;
  /** Typical processing time the broker takes to honor an opt-out. */
  avgDays: number;
}

export const BROKERS: Broker[] = [
  // People-search
  { id: "spokeo", name: "Spokeo", category: "People search", method: "form", optOutUrl: "https://www.spokeo.com/optout", avgDays: 7 },
  { id: "whitepages", name: "WhitePages", category: "People search", method: "form", optOutUrl: "https://www.whitepages.com/suppression-requests", avgDays: 10 },
  { id: "radaris", name: "Radaris", category: "People search", method: "form", optOutUrl: "https://radaris.com/control/privacy", avgDays: 10 },
  { id: "peoplefinders", name: "PeopleFinders", category: "People search", method: "form", optOutUrl: "https://www.peoplefinders.com/opt-out", avgDays: 7 },
  { id: "fastpeoplesearch", name: "FastPeopleSearch", category: "People search", method: "form", optOutUrl: "https://www.fastpeoplesearch.com/removal", avgDays: 3 },
  { id: "us-search", name: "US Search", category: "People search", method: "form", avgDays: 7 },
  { id: "peekyou", name: "PeekYou", category: "People search", method: "form", avgDays: 10 },
  { id: "truepeoplesearch", name: "TruePeopleSearch", category: "People search", method: "form", avgDays: 3 },
  { id: "searchpeoplefree", name: "SearchPeopleFree", category: "People search", method: "form", avgDays: 5 },
  { id: "usphonebook", name: "USPhoneBook", category: "People search", method: "form", avgDays: 5 },
  { id: "addresses", name: "Addresses.com", category: "People search", method: "form", avgDays: 7 },
  { id: "anywho", name: "AnyWho", category: "People search", method: "form", avgDays: 7 },
  { id: "411", name: "411.com", category: "People search", method: "form", avgDays: 7 },
  { id: "clustrmaps", name: "ClustrMaps", category: "People search", method: "form", avgDays: 5 },
  { id: "neighborwho", name: "NeighborWho", category: "People search", method: "form", avgDays: 7 },
  { id: "nuwber", name: "Nuwber", category: "People search", method: "form", avgDays: 5 },

  // Background-check
  { id: "beenverified", name: "BeenVerified", category: "Background check", method: "form", optOutUrl: "https://www.beenverified.com/app/optout/search", avgDays: 5 },
  { id: "intelius", name: "Intelius", category: "Background check", method: "form", optOutUrl: "https://www.intelius.com/opt-out", avgDays: 7 },
  { id: "truthfinder", name: "TruthFinder", category: "Background check", method: "form", optOutUrl: "https://www.truthfinder.com/opt-out", avgDays: 5 },
  { id: "instantcheckmate", name: "Instant Checkmate", category: "Background check", method: "form", avgDays: 5 },
  { id: "checkpeople", name: "CheckPeople", category: "Background check", method: "form", avgDays: 7 },
  { id: "publicrecordsnow", name: "PublicRecordsNow", category: "Background check", method: "form", avgDays: 10 },
  { id: "smartbackgroundchecks", name: "SmartBackgroundChecks", category: "Background check", method: "form", avgDays: 7 },
  { id: "advancedbackgroundchecks", name: "AdvancedBackgroundChecks", category: "Background check", method: "form", avgDays: 7 },

  // Reputation / identity
  { id: "mylife", name: "MyLife", category: "Reputation", method: "email", avgDays: 14 },
  { id: "pipl", name: "Pipl", category: "Identity", method: "email", avgDays: 21 },
  { id: "thatsthem", name: "ThatsThem", category: "Identity", method: "form", avgDays: 5 },
  { id: "zabasearch", name: "ZabaSearch", category: "Identity", method: "form", avgDays: 7 },

  // Marketing / risk data
  { id: "acxiom", name: "Acxiom", category: "Marketing data", method: "api", avgDays: 30 },
  { id: "epsilon", name: "Epsilon", category: "Marketing data", method: "email", avgDays: 30 },
  { id: "oracle-datacloud", name: "Oracle Data Cloud", category: "Marketing data", method: "email", avgDays: 30 },
  { id: "towerdata", name: "TowerData", category: "Marketing data", method: "email", avgDays: 30 },
  { id: "lexisnexis", name: "LexisNexis", category: "Risk data", method: "form", optOutUrl: "https://optout.lexisnexis.com", avgDays: 30 },
  { id: "corelogic", name: "CoreLogic", category: "Risk data", method: "email", avgDays: 30 },
];

export function findBroker(name: string): Broker | undefined {
  const n = name.toLowerCase();
  return BROKERS.find((b) => b.name.toLowerCase() === n || b.id === n);
}
