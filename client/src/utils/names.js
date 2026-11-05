/**
 * How a person's name is shown on the site (NIQS reviews, Oct and Nov 2026).
 *
 * The Institute asked for every name to fit on one line, title included, so a
 * card never splits "QS Dr." from the name or pushes "FNIQS" onto a line of
 * its own. On 4 Nov 2026 the Secretariat (Gloria Ifiorah) set the order and
 * reversed the October surname-first form: the first name in full, the
 * initial of any middle name, then the surname, then the post-nominals, all
 * on one line -- "QS Kene C. Nzekwe, FNIQS" for three names, "QS Kene Nzekwe,
 * FNIQS" for two. Professional and academic titles (QS, Dr., Prof., Engr.,
 * Arc., Surv., Barr.) and the post-nominals after the comma are kept as the
 * record holds them; members who are still probationers carry no "QS" in the
 * record, so none is added. Traditional, religious and courtesy titles ("High
 * Chief", "Alhaji", "Mrs" ...) are left off the card, as agreed at the first
 * review. They stay in the record and in the hover title.
 *
 * The records were typed by different people over the years, so the order is
 * not consistent: most are given-name first ("QS Kene Christopher Nzekwe"), a
 * few surname first ("QS Dr Ade-Ojo Comfort Olubunmi"). A hyphenated token is
 * almost always a surname, so when there is exactly one it is taken as the
 * surname wherever it sits; otherwise the last word is. That is a rule of
 * thumb, not a fact about anyone's name -- hence `shortName` on the record,
 * which the Secretariat can set in admin to override it for one person, and
 * which server/scripts/applyNameFormatNov2026.js sets for the records known
 * to be stored surname first.
 */

export const NAME_RULE =
  'Titles + first name in full + initials of middle names + surname in full, post-nominals after a comma, on one line. ' +
  'Example: "QS Kene Christopher Nzekwe, FNIQS" stays "QS Kene C. Nzekwe, FNIQS"; two names stay as they are.';

/* Titles and honorifics that lead a name, longest first so "High Chief" wins
   over "Chief". Compared case-insensitively, without a trailing full stop. */
const PREFIXES = [
  'high chief', 'qs', 'surv', 'dr', 'prof', 'engr', 'arc', 'arch', 'chief', 'alhaji', 'alhaja',
  'hajiya', 'hajia', 'mallam', 'malam', 'mrs', 'mr', 'ms', 'miss', 'barr', 'sir', 'hon', 'pastor',
  'rev', 'otunba', 'oba', 'hrh', 'dame', 'lady', 'elder', 'deacon', 'deaconess', 'comrade', 'amb',
];

/* The only leading titles a card shows. Everything else in PREFIXES is
   recognised (so it is not mistaken for a given name) but not displayed. */
const SHOWN_TITLES = ['qs', 'surv', 'dr', 'prof', 'engr', 'arc', 'arch', 'barr'];

const bare = (w) => w.replace(/\.$/, '').toLowerCase();

/** Split a record into its leading titles, the name words, and post-nominals. */
export function parseName(full) {
  const [namePart, ...post] = String(full || '').split(',');
  const words = namePart.trim().split(/\s+/).filter(Boolean);
  const titles = [];
  while (words.length) {
    const two = words.length > 1 ? bare(`${words[0]} ${words[1]}`) : null;
    if (two && PREFIXES.includes(two)) { titles.push(words.shift(), words.shift()); continue; }
    if (PREFIXES.includes(bare(words[0]))) { titles.push(words.shift()); continue; }
    break;
  }
  const postnominals = post.join(',').split(',').map(s => s.trim()).filter(Boolean);
  return { titles, words, postnominals };
}

const isInitial = (w) => /^[A-Za-z]\.?$/.test(w) || /^([A-Za-z]\.)+$/.test(w);

/**
 * The one-line form of a name. `override` (the record's `shortName`) wins
 * whenever it is set: it is the Secretariat's correction for a name the rule
 * gets wrong. `drop` lists post-nominals that only restate the page the name
 * sits on — PPNIQS on the Past Presidents page, whose title already says it.
 * Everywhere else PPNIQS stays: on the Board of Trustees it is news, and NIQS
 * asked for it there.
 */
export function shortName(full, { override, drop = [] } = {}) {
  if (override && String(override).trim()) return String(override).trim();
  const { titles, words, postnominals } = parseName(full);
  if (!words.length) return String(full || '').trim();
  const hyphenated = words.filter(w => w.includes('-'));
  const surnameAt = hyphenated.length === 1 ? words.indexOf(hyphenated[0]) : words.length - 1;
  const surname = words[surnameAt];
  const given = words.filter((_, i) => i !== surnameAt);
  // The first given name that is spelt out stays whole and goes first; every
  // other given name becomes an initial, in order, before the surname. A
  // record that only has initials ("QS B. Tanko") has no first name to spell
  // out, so it is initials + surname until the full name is on the record.
  const firstAt = given.findIndex(w => !isInitial(w));
  const initials = given
    .filter((_, i) => i !== firstAt)
    .map(w => (isInitial(w) ? (w.endsWith('.') ? w : `${w}.`) : `${w[0].toUpperCase()}.`));
  const shown = [...(firstAt >= 0 ? [given[firstAt]] : []), ...initials, surname];
  const keptTitles = titles.filter(w => SHOWN_TITLES.includes(bare(w)));
  const dropSet = drop.map(d => d.toLowerCase());
  const posts = postnominals.filter(pn => !dropSet.includes(pn.toLowerCase()));
  const name = [...keptTitles, ...shown].join(' ');
  return posts.length ? `${name}, ${posts.join(', ')}` : name;
}

/**
 * True when the rule is guessing more than usual: two hyphenated words (which
 * one is the surname?) or a single word (nothing to initialise). Used to list
 * names for the Secretariat to check, not to change what is shown.
 */
export function nameNeedsCheck(full) {
  const { words } = parseName(full);
  return words.length < 2 || words.filter(w => w.includes('-')).length > 1;
}
