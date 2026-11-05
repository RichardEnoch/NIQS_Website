/**
 * The Institute's signed agreements.
 *
 * Single source of truth: the Reciprocity page renders the list and the Home
 * page's hero tile counts it, so the two can never disagree.
 *
 * Replaced on 5 Nov 2026 with the seven agreements the Secretariat sent
 * (Drive: MATERIAL - BATCH 2 / RECIPROCITY AGREEMENT, 4 Nov 2026), when NIQS
 * asked for the Home page tile to read 7. The twelve entries before this were
 * placeholder text written before the documents arrived. Each entry below is
 * taken from the signed document itself: parties, type and date of signature.
 * Add an agreement here when the Secretariat sends its signed copy.
 */

export const agreements = [
  {
    body: 'Australian Institute of Quantity Surveyors (AIQS)',
    kind: 'Mutual Recognition Agreement',
    country: 'Australia', signed: 'September 2022', flag: '🇦🇺',
    desc: 'Recognises equivalence in membership entry and advancement standards: corporate members of either institute may be elected to the other, subject to CPD compliance, good standing and a professional interview.',
  },
  {
    body: 'New Zealand Institute of Quantity Surveyors (NZIQS)',
    kind: 'Reciprocity Agreement',
    country: 'New Zealand', signed: 'September 2023', flag: '🇳🇿',
    desc: 'Members in good standing of either institute may be elected to the other after local practice experience and a professional competence interview. The institutes also exchange research and knowledge.',
  },
  {
    body: 'Royal Institution of Surveyors Malaysia, Quantity Surveying Division (RISMQS)',
    kind: 'Certificate of Collaboration',
    country: 'Malaysia', signed: 'September 2023', flag: '🇲🇾',
    desc: 'Cooperation on standards, codes of practice and ethics, joint workshops, seminars, research and CPD, the sharing of cost information, and work towards a mutual recognition agreement.',
  },
  {
    body: 'Qatar Green Building Council (QGBC)',
    kind: 'Memorandum of Understanding',
    country: 'Qatar', signed: 'October 2018', flag: '🇶🇦',
    desc: 'Professional collaboration on sustainability and cost and value management in the built environment, training, the exchange of industry experience, certification of qualifying members, and joint research.',
  },
  {
    body: 'Border Communities Development Agency (BCDA)',
    kind: 'Memorandum of Understanding',
    country: 'Nigeria', signed: 'March 2025', flag: '🇳🇬',
    desc: 'A memorandum between the Institute and the Federal Government agency responsible for development in Nigeria’s border communities.',
  },
  {
    body: 'Fiscal Responsibility Commission (FRC)',
    kind: 'Memorandum of Understanding',
    country: 'Nigeria', signed: 'June 2026', flag: '🇳🇬',
    desc: 'A memorandum between the Institute and the Federal Government commission that oversees prudent management of public resources.',
  },
  {
    body: 'SANA Group of Companies Limited',
    kind: 'Memorandum of Understanding',
    country: 'Nigeria', signed: 'March 2026', flag: '🇳🇬',
    desc: 'Joint research, development and industry advancement in Nigeria, with SANA Academy.',
  },
];

export const AGREEMENT_COUNT = agreements.length;
