/**
 * How a person's name is shown on the site (NIQS review, Oct 2026).
 *
 * The Institute asked for every name to fit on one line, title included, so a
 * card never splits "QS Dr." from the name or pushes "FNIQS" onto a line of
 * its own. Given names become initials; the surname stays whole, because the
 * surname is what a reader recognises. Professional and academic titles (QS,
 * Dr., Prof., Engr., Arc., Surv., Barr.) and the post-nominals after the comma
 * are kept exactly as the record holds them. Traditional, religious and
 * courtesy titles ("High Chief", "Alhaji", "Mrs" ...) are left off the card:
 * the meeting agreed to drop them so every name reads the same way and fits
 * on one line. They stay in the record and in the hover title.
 *
 * The records were typed by different people over the years, so the order is
 * not consistent: most are given-name first ("QS Kene Christopher Nzekwe"), a
 * few surname first ("QS Dr Ade-Ojo Comfort Olubunmi"). A hyphenated token is
 * almost always a surname, so when there is exactly one it is taken as the
 * surname wherever it sits; otherwise the last word is. That is a rule of
 * thumb, not a fact about anyone's name — hence `shortName` on the record,
 * which the Secretariat can set in admin to override it for one person.
 */

export const NAME_RULE =
  'Titles + initials of every given name + surname in full, post-nominals after a comma, on one line. ' +
  'Example: "QS Kene Christopher Nzekwe, FNIQS" becomes "QS K. C. Nzekwe, FNIQS".';

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

/* Post-nominals that only restate the page a name sits on. PPNIQS is the one
   in the data: it means "past president", which the Past Presidents page has
   already said in its title. */
const DROPPED_POSTNOMINALS = /^PPNIQS$/i;

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
  const postnominals = post.join(',').split(',').map(s => s.trim())
    .filter(s => s && !DROPPED_POSTNOMINALS.test(s));
  return { titles, words, postnominals };
}

const isInitial = (w) => /^[A-Za-z]\.?$/.test(w) || /^([A-Za-z]\.)+$/.test(w);

/**
 * The one-line form of a name. `override` (the record's `shortName`) wins
 * whenever it is set: it is the Secretariat's correction for a name the rule
 * gets wrong.
 */
export function shortName(full, { override } = {}) {
  if (override && String(override).trim()) return String(override).trim();
  const { titles, words, postnominals } = parseName(full);
  if (!words.length) return String(full || '').trim();
  const hyphenated = words.filter(w => w.includes('-'));
  const surnameAt = hyphenated.length === 1 ? words.indexOf(hyphenated[0]) : words.length - 1;
  const shown = words.map((w, i) => {
    if (i === surnameAt || isInitial(w)) return isInitial(w) && !w.endsWith('.') ? `${w}.` : w;
    return `${w[0].toUpperCase()}.`;
  });
  const keptTitles = titles.filter(w => SHOWN_TITLES.includes(bare(w)));
  const name = [...keptTitles, ...shown].join(' ');
  return postnominals.length ? `${name}, ${postnominals.join(', ')}` : name;
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
