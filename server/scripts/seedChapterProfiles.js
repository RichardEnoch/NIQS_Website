/**
 * Publishes full chapter profiles — about copy, contact block and the complete
 * executive roster with portraits — for the chapters whose material the
 * secretariat has supplied.
 *
 * Portraits are read from <portraitsDir>/<chapterKey>/<chapterKey>-<slug>.jpg
 * (prepared from the chapter's own group poster / photo pack), uploaded through
 * the shared storage helper, and attached to Exco records scoped to the chapter.
 *
 * Idempotent: chapters are matched by name, exco by (scope, chapter, title).
 * Existing phone/email on a record are preserved unless this file supplies them.
 *
 * Usage (from the server folder):
 *   node scripts/seedChapterProfiles.js <portraitsDir> [chapterKey ...] [--no-photos]
 *
 * Naming a chapter limits the run to it. Worth doing: without a filter every
 * chapter re-uploads its whole roster, which is a fresh Cloudinary asset per
 * portrait for no change.
 *
 * --no-photos updates the roster text only and leaves every portrait where it
 * is. That is the common follow-up: the chapter corrects a spelling or confirms
 * a title weeks after its photos went up, and re-uploading them to fix a name
 * would be pure waste. <portraitsDir> is then only checked for existence.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { storeBuffer } = require('../utils/storage');
const Chapter = require('../models/Chapter');
const Exco = require('../models/Exco');

const portraitsDir = process.argv[2];
const noPhotos = process.argv.includes('--no-photos');
if (!portraitsDir) {
  console.error('Usage: node scripts/seedChapterProfiles.js <portraitsDir> [chapterKey ...] [--no-photos]');
  process.exit(2);
}

/* Roster entries: [portraitSlug, name, title, order]

   Names and titles follow each chapter's own published material, verbatim —
   including whether a person is styled QS, Mr or Miss. Never add "QS" to a name
   a chapter supplied bare without asking them first: on the institute's own site
   that reads as a claim about registration, and Ebonyi's pack shows the chapters
   do distinguish. Ask, then record who confirmed and when.

   The secretariat settled what a bare name means on 2026-08-04: the person is a
   probationer, not yet a registered member, and should be styled Mr or Ms — not
   left bare and never QS. That is why Delta's YQSF Coordinator is Ms Nneli Esther
   Ifeoma below, over the chapter's own blanket claim that all fourteen were QS.

   Which cuts both ways, so do not sweep it: Niger's roster arrived bare to the
   last man including the Chairman, and a chapter chairman is not a probationer.
   A pack with no prefixes anywhere is a chapter that omitted them, not ten
   unregistered officers. Confirm per person before restyling anyone — getting an
   honorific wrong in public is worse than leaving a name bare.

   `address` is optional. Better absent than invented — the chapter page simply
   drops the line. */
const CHAPTERS = [
  {
    key: 'katsina',
    chapterName: 'Katsina Chapter',
    state: 'Katsina',
    stateLabel: 'Katsina State',
    chairperson: 'QS Abubakar Yahaya Kusada, FNIQS',
    secretary: "QS Sada Rabi'u Zare, MNIQS",
    address: 'NIQS Katsina State Chapter Secretariat, Katsina',
    about:
      'The Katsina State Chapter of the Nigerian Institute of Quantity Surveyors '
      + 'brings together registered quantity surveyors practising across Katsina State '
      + 'in the North West geopolitical zone. The chapter is led by a sixteen-member '
      + 'executive committee covering administration, finance, research and development, '
      + 'public relations and member welfare, and works alongside the National '
      + 'Secretariat to deliver continuing professional development, uphold professional '
      + 'standards in construction cost management, and advocate for the quantity '
      + 'surveying profession with government and industry stakeholders in the state. '
      + 'The chapter also hosts the Young Quantity Surveyors Forum (YQSF) and West '
      + 'African Quantity Surveyors coordination for Katsina.',
    // Portrait used as the chapter's hero / card image
    heroPortrait: 'abubakar-yahaya-kusada',
    /* Six of these sixteen carry no photograph on the live site any more, and
       must not get one back from this script: they were cut from the chapter's
       printed group poster, and the print crushed the green channel and clipped
       red. Four came out magenta or violet (B/G up to 1.48 against 0.83 on a
       correct portrait) and two never matted at all, showing the source's own
       rectangle. White balance cannot undo it — correcting the ratio amplifies
       green noise into a wash, tried and abandoned 2026-08-05 — so the
       secretariat's instruction is the placeholder until the chapter sends real
       photographs. `placeholderPoorPortraits.js` is what cleared them.

       Sadiya Sani Yar'Adua, Maryam Mua'azu, Ahmed Salisu, Aminu Labo,
       Muhammad Laminu Ibrahim and Adamu Idris. Delete their files from
       <portraitsDir>/katsina/ before re-running this, or they come straight
       back — a roster entry with no file is written as text only. */
    roster: [
      ['abubakar-yahaya-kusada', 'QS Abubakar Yahaya Kusada, FNIQS', 'Chapter Chairman', 1],
      ['kabir-lawal', 'QS Kabir Lawal, MNIQS', 'Vice Chairman', 2],
      ['sada-rabiu-zare', "QS Sada Rabi'u Zare, MNIQS", 'General Secretary', 3],
      ['ahmed-salisu', 'Ahmed Salisu', 'Assistant General Secretary', 4],
      ['muntari-isiyaku', 'QS Muntari Isiyaku, MNIQS', 'Treasurer', 5],
      ['kabir-bawale-nasiru', 'QS Kabir Bawale Nasiru, MNIQS', 'Financial Secretary', 6],
      ['adamu-idris', 'QS Adamu Idris, MNIQS', 'Assistant Financial Secretary', 7],
      ['usman-sabo-nalado', 'QS Usman Sabo Nalado, MNIQS', 'Research & Development Secretary', 8],
      ['yazid-ibrahim-muhammad', "QS Yazid Ibrahim Muh'd, MNIQS", 'Director of Public Relations', 9],
      ['maryam-muaazu', "QS Maryam Mua'azu, MNIQS", 'Welfare Director', 10],
      ['shamsuddeen-hassan', 'QS Shamsuddeen Hassan, FNIQS', 'Immediate Past Chairman', 11],
      ['shehu-samaila', 'QS Shehu Samaila, MNIQS', 'Ex-Officio I', 12],
      ['muhammad-laminu-ibrahim', 'QS Muhammad Laminu Ibrahim, PhD, MNIQS', 'Ex-Officio II', 13],
      ['aminu-labo', 'Aminu Labo', 'Ex-Officio III', 14],
      ['sadiq-yusuf', 'Sadiq Yusuf', 'YQSF Coordinator', 15],
      ['sadiya-sani-yaradua', "QS Sadiya Sani Yar'Adua, MNIQS", 'WAQS Coordinator', 16],
    ],
  },
  {
    key: 'osun',
    chapterName: 'Osun Chapter',
    state: 'Osun',
    stateLabel: 'Osun State',
    chairperson: 'QS Dr. Nofiu Abiodun Musa, MNIQS',
    secretary: 'QS Oyeniran Taofeek Bamidele',
    address: 'NIQS Osun State Chapter Secretariat, Osogbo, Osun State',
    about:
      'The Osun State Chapter of the Nigerian Institute of Quantity Surveyors serves '
      + 'registered quantity surveyors practising across Osun State in the South West '
      + 'geopolitical zone. A ten-member executive committee leads the chapter across '
      + 'administration, finance, public relations and research and development, working '
      + 'with the National Secretariat to run continuing professional development '
      + 'programmes, uphold ethical and technical standards in construction cost '
      + 'management, and represent the profession before government, industry and the '
      + 'academic community in the state.',
    heroPortrait: 'nofiu-abiodun-musa',
    roster: [
      ['nofiu-abiodun-musa', 'QS Dr. Nofiu Abiodun Musa, MNIQS', 'Chapter Chairman', 1],
      ['olayinka-kingsley-otaru', 'QS Olayinka F. Kingsley-Otaru, FNIQS', 'Deputy Chairman', 2],
      ['oyeniran-taofeek-bamidele', 'QS Oyeniran Taofeek Bamidele', 'General Secretary', 3],
      ['sanusi-isaac-olakunle', 'Sanusi Isaac Olakunle', 'Assistant General Secretary', 4],
      ['oladosu-ismaila-damilola', 'QS Oladosu Ismaila Damilola', 'Treasurer', 5],
      ['fasanmoye-joy-oluwaseyi', 'QS Mrs. Fasanmoye Joy Oluwaseyi', 'Financial Secretary', 6],
      ['salaudeen-abd-rasheed-adekunle', 'QS Salaudeen Abd-Rasheed Adekunle', 'Public Relations Secretary', 7],
      ['adegoke-bolanle-felicia', 'QS Dr. Mrs. Adegoke Bolanle Felicia', 'Research & Development Secretary', 8],
      ['adegoke-johnson-olufemi', 'QS Adegoke Johnson Olufemi', 'Ex-Officio — Immediate Past Chairman', 9],
      ['adenike-ademiluyi', 'QS Mrs. Adenike Ademiluyi', 'Ex-Officio — WAQSON', 10],
    ],
  },
  {
    key: 'delta',
    chapterName: 'Delta Chapter',
    state: 'Delta',
    stateLabel: 'Delta State',
    chairperson: 'QS Julius Safuakemefa Apodor, FNIQS',
    secretary: 'QS Akpomiemie Oghenemene Andrew',
    about:
      'The Delta State Chapter of the Nigerian Institute of Quantity Surveyors serves '
      + 'registered quantity surveyors practising across Delta State in the South South '
      + 'geopolitical zone. A fourteen-member executive committee leads the chapter across '
      + 'administration, finance, public relations and research and development, working '
      + 'with the National Secretariat to run continuing professional development '
      + 'programmes, uphold ethical and technical standards in construction cost '
      + 'management, and represent the profession before government, industry and the '
      + 'academic community in the state. The chapter also hosts the Young Quantity '
      + 'Surveyors Forum (YQSF) for Delta.',
    heroPortrait: 'julius-safuakemefa-apodor',
    /* Delta's pack gave bare names; the chapter confirmed all fourteen are QS
       (2026-07-28). Post-nominals still to come for everyone but the chairman.

       That blanket confirmation was wrong about one of them: the secretariat
       corrected the YQSF Coordinator to Ms Nneli Esther Ifeoma on 2026-08-04,
       she being a probationer and not yet registered. Which is the general rule
       — a name a chapter supplies without QS is a member who has not registered
       yet, not a caption they were careless with. */
    roster: [
      ['julius-safuakemefa-apodor', 'QS Julius Safuakemefa Apodor, FNIQS', 'Chapter Chairman', 1],
      ['francis-ogheneyare-okorho', 'QS Francis Ogheneyare Okorho', 'Deputy Chairman', 2],
      ['akpomiemie-oghenemene-andrew', 'QS Akpomiemie Oghenemene Andrew', 'General Secretary', 3],
      ['fortune-eguonoghene-jegbe', 'QS Fortune Eguonoghene Jegbe', 'Assistant General Secretary', 4],
      ['emily-ekata-ikhide', 'QS Emily Ekata Ikhide', 'Treasurer', 5],
      ['omaghomi-noyo-joe', 'QS Omaghomi Noyo Joe', 'Financial Secretary', 6],
      ['omoh-paul-igbebo', 'QS Omoh-Paul Igbebo', 'Assistant Financial Secretary', 7],
      ['ibatere-prosper-un', 'QS Ibatere Prosper U.N.', 'Public Relations Officer', 8],
      ['nwazodoni-samuel-ifechukwude', 'QS Nwazodoni Samuel Ifechukwude', 'Assistant Public Relations Officer', 9],
      ['paul-olorunfemi', 'QS Paul Olorunfemi', 'Research & Development Secretary', 10],
      ['nneli-esther-ifeoma', 'Ms Nneli Esther Ifeoma', 'YQSF Coordinator', 11],
      // The pack labels three people simply "Ex. Officio"; numbered here in the
      // order supplied so the records stay distinct.
      ['clement-onowono-aduze', 'QS Dr. Clement Onowono Aduze', 'Ex-Officio I', 12],
      ['martins-osa-izevbokun', 'QS Martins Osa. Izevbokun', 'Ex-Officio II', 13],
      ['siakpere-patrick-onoriode', 'QS Siakpere Patrick Onoriode', 'Ex-Officio III', 14],
    ],
  },
  {
    key: 'ebonyi',
    chapterName: 'Ebonyi Chapter',
    state: 'Ebonyi',
    stateLabel: 'Ebonyi State',
    chairperson: 'QS Agha Kalu Agwu, MNIQS',
    secretary: 'QS Eze Clinton Ogbonnia, MNIQS',
    about:
      'The Ebonyi State Chapter of the Nigerian Institute of Quantity Surveyors brings '
      + 'together registered quantity surveyors practising across Ebonyi State in the '
      + 'South East geopolitical zone. A ten-member executive committee leads the chapter '
      + 'across administration, finance, public relations and research and development, '
      + 'working with the National Secretariat to deliver continuing professional '
      + 'development, uphold professional standards in construction cost management, and '
      + 'advocate for the quantity surveying profession with government and industry '
      + 'stakeholders in the state.',
    heroPortrait: 'agha-kalu-agwu',
    /* Ebonyi resent the pack on 2026-07-28 — this time the executives' own
       photographs rather than the designed cards with the gold caption bar,
       which is what the first run had to crop and matte its way out of. Eight of
       the ten came back, and the General Secretary's name with them: the card
       read "Clinton Eze Ogbonnia", the resend has it as Eze Clinton Ogbonnia.
       The Treasurer and Ex-Officio II were not in the resend, so they keep the
       portraits already published — seeding simply skips a roster entry whose
       file is absent. */
    roster: [
      ['agha-kalu-agwu', 'QS Agha Kalu Agwu, MNIQS', 'Chapter Chairman', 1],
      ['nwafor-eric-eze', 'QS Nwafor Eric Eze, MNIQS', 'Deputy Chairman', 2],
      ['eze-clinton-ogbonnia', 'QS Eze Clinton Ogbonnia, MNIQS', 'General Secretary', 3],
      ['agha-charity-c', 'Miss Agha Charity C.', 'Assistant General Secretary', 4],
      ['adeniyi-gbenga', 'QS Adeniyi Gbenga, MNIQS', 'Treasurer', 5],
      ['aliechem-reuben-c', 'Mr Aliechem Reuben C.', 'Financial Secretary', 6],
      ['abrams-ikechukwu-d', 'Mr Abrams Ikechukwu D.', 'Public Relations Secretary', 7],
      ['onya-benjamin-chinedu', 'QS Onya Benjamin Chinedu, MNIQS', 'Research & Development Secretary', 8],
      ['chukwu-patrick-oko', 'QS Chukwu Patrick Oko, MNIQS', 'Ex-Officio I', 9],
      ['anikwe-nnaemeka-j', 'QS Anikwe Nnaemeka J., MNIQS', 'Ex-Officio II', 10],
    ],
  },
  {
    key: 'nasarawa',
    chapterName: 'Nasarawa Chapter',
    state: 'Nasarawa',
    stateLabel: 'Nasarawa State',
    chairperson: 'QS Jibrin Mairiga, MNIQS',
    secretary: 'QS Z. I. Isah',
    about:
      'The Nasarawa State Chapter of the Nigerian Institute of Quantity Surveyors serves '
      + 'registered quantity surveyors practising across Nasarawa State in the North '
      + 'Central geopolitical zone. An eight-member executive committee leads the chapter '
      + 'across administration, finance, public relations and member welfare, working with '
      + 'the National Secretariat to deliver continuing professional development, uphold '
      + 'professional standards in construction cost management, and advocate for the '
      + 'profession with government and industry stakeholders in the state. The chapter '
      + 'also hosts the Young Quantity Surveyors Forum (YQSF) for Nasarawa.',
    heroPortrait: 'jibrin-mairiga',
    // The pack names everyone by initials only; full names still to come from the chapter.
    roster: [
      ['jibrin-mairiga', 'QS Jibrin Mairiga, MNIQS', 'Chapter Chairman', 1],
      ['a-y-shuaibu', 'QS A. Y. Shuaibu', 'Deputy Chairman', 2],
      ['z-i-isah', 'QS Z. I. Isah', 'General Secretary', 3],
      ['s-a-buba', 'QS S. A. Buba', 'Assistant General Secretary', 4],
      ['m-o-bilyaminu', 'QS M. O. Bilyaminu', 'Treasurer', 5],
      ['y-d-obiya', 'QS Y. D. Obiya', 'Financial Secretary', 6],
      ['a-a-edego', 'QS A. A. Edego', 'Public Relations Secretary', 7],
      ['m-z-adih', 'QS M. Z. Adih', 'YQSF Coordinator', 8],
    ],
  },
  {
    key: 'kaduna',
    chapterName: 'Kaduna Chapter',
    state: 'Kaduna',
    stateLabel: 'Kaduna State',
    chairperson: 'QS Dr. Bukola Aluko-Olokun, FNIQS',
    secretary: 'QS Ozavize Omayoza Ojoro, MNIQS',
    about:
      'The Kaduna State Chapter of the Nigerian Institute of Quantity Surveyors brings '
      + 'together registered quantity surveyors practising across Kaduna State in the '
      + 'North West geopolitical zone. A thirteen-member executive committee leads the '
      + 'chapter across administration, finance, public relations and research and '
      + 'development, working with the National Secretariat to deliver continuing '
      + 'professional development, uphold professional standards in construction cost '
      + 'management, and represent the profession before government, industry and the '
      + 'academic community in the state.',
    heroPortrait: 'bukola-aluko-olokun',
    /* Titles are the chapter's own, from the captions on its senate pack — hence
       "Chairperson" and "Assistant Secretary General" here where other chapters
       say Chairman and Assistant General Secretary. Nothing keys off the exact
       wording; the chapter page renders whatever the record carries.

       The pack ranks nobody: it labels two people "Ex-Officio" and three
       "Co-Opted Member", so I and II and III below are ordering, not the
       chapter's own numbering. Worth confirming before anyone reads seniority
       into it. */
    roster: [
      ['bukola-aluko-olokun', 'QS Dr. Bukola Aluko-Olokun, FNIQS', 'Chapter Chairperson', 1],
      ['mohammed-saidu-minin', 'QS Mohammed Saidu Minin, MNIQS', 'Deputy Chairman', 2],
      ['ozavize-omayoza-ojoro', 'QS Ozavize Omayoza Ojoro, MNIQS', 'General Secretary', 3],
      ['habu-david-obadiah', 'QS Habu David Obadiah, MNIQS', 'Assistant Secretary General', 4],
      ['gabriel-omotayo-oladija', 'QS Gabriel Omotayo Oladija, FNIQS', 'Treasurer', 5],
      ['jamil-mohammed-ibrahim', 'QS Jamil Mohammed Ibrahim, MNIQS', 'Financial Secretary', 6],
      ['gyorend-simon-yangs', 'QS Gyorend Simon Yangs, MNIQS', 'Public Relations Officer', 7],
      ['hassana-mailabari-kumo', 'QS Dr. Hassana Mailabari Kumo, MNIQS', 'Research & Development Secretary', 8],
      ['timothy-o-oluwasakin', 'QS Timothy O. Oluwasakin, FNIQS', 'Ex-Officio I', 9],
      ['muinat-omolara-sanni', 'QS Muinat Omolara Sanni, MNIQS', 'Ex-Officio II', 10],
      ['rebacca-kingsley-madaki', 'QS Dr. Rebacca Kingsley Madaki, FNIQS', 'Co-opted Member I', 11],
      ['khadijat-yusuf', 'QS Khadijat Yusuf', 'Co-opted Member II', 12],
      ['yusuf-musa-uba', 'QS Yusuf Musa Uba, MNIQS', 'Co-opted Member III', 13],
    ],
  },
  {
    key: 'fct',
    chapterName: 'FCT Chapter',
    state: 'FCT',
    stateLabel: 'FCT',
    chairperson: 'QS Ahmed Usman Kankia, FNIQS',
    secretary: 'QS Buhari Tanko Haruna, FNIQS',
    about:
      'The FCT Chapter of the Nigerian Institute of Quantity Surveyors serves registered '
      + 'quantity surveyors practising across the Federal Capital Territory. Sitting in '
      + "the seat of federal government, the chapter works closest to the institute's "
      + 'National Secretariat, and its chairman represents the Territory on the National '
      + 'Executive Council. A fourteen-member executive committee leads the chapter across '
      + 'administration, finance, public relations and education and professional '
      + 'development, delivering continuing professional development, upholding standards '
      + 'in construction cost management, and representing the profession before '
      + 'government, industry and the academic community in Abuja. The chapter also hosts '
      + 'the Young Quantity Surveyors Forum (YQSF) and West African Quantity Surveyors '
      + 'Network coordination for the FCT.',
    heroPortrait: 'ahmed-usman-kankia',
    /* Roster read from the chapter's "Senate Members FCT CHAPTER" document, whose
       wording is followed here — including the YQSF Coordinator, the one name it
       supplies bare, which stays bare.

       Three names the document and the photo captions disagree on, all recorded
       below the way the weight of evidence points and all worth a line back to
       the chapter: the chairman ("Kankika" in the document against Kankia in its
       own filename and in the secretariat's caption of 2026-07-27); Ex-Officio II
       ("Uzor Amaka" against Uzoamaka); and the WAQSN representative (Gowom
       against Gowon). The Deputy Chairman keeps the fuller "Ayodele" already
       published rather than the document's "Ayo" — the same name, not a
       correction.

       Fourteen executives, thirteen portraits: no photograph came with the pack
       for the YQSF Coordinator, so his card renders as a monogram until one does. */
    roster: [
      ['ahmed-usman-kankia', 'QS Ahmed Usman Kankia, FNIQS', 'Chapter Chairman', 1],
      ['theophilus-ayo-apere', 'QS Theophilus Ayodele Apere, FNIQS', 'Deputy Chairman', 2],
      ['buhari-tanko-haruna', 'QS Buhari Tanko Haruna, FNIQS', 'General Secretary', 3],
      ['ayuba-musa', 'QS Ayuba Musa, MNIQS', 'Assistant General Secretary', 4],
      ['abel-gankon-dawah', 'QS Abel Gankon Dawah, FNIQS', 'Treasurer', 5],
      ['yusuf-jamiu-adewale', 'QS Yusuf Jamiu Adewale, MNIQS', 'Financial Secretary', 6],
      ['adamu-musa-barau', 'QS Adamu Musa Barau, MNIQS', 'Public Relations Secretary', 7],
      ['mustapha-muhd-abdullahi', "QS Mustapha Muh'd Abdullahi, FNIQS", 'Education & Professional Development Secretary', 8],
      ['ahmed-tijjani-lawal', 'QS Ahmed Tijjani Lawal, MNIQS', 'Ex-Officio I', 9],
      ['uzoamaka-okobia', 'QS Uzoamaka Okobia, MNIQS', 'Ex-Officio II', 10],
      ['mary-b-gowom', 'QS Mary B. Gowom, FNIQS', 'WAQSN Representative', 11],
      ['abdulrafiu-abdullahi', 'Abdulrafiu Abdullahi', 'YQSF Coordinator', 12],
      ['zemo-masha-alexander', 'QS Zemo Masha Alexander, FNIQS', 'Co-opted Member I', 13],
      ['uwem-justine-glory', 'QS Uwem Justine Glory, MNIQS', 'Co-opted Member II', 14],
    ],
  },
  {
    key: 'rivers',
    chapterName: 'Rivers Chapter',
    state: 'Rivers',
    stateLabel: 'Rivers State',
    chairperson: 'QS Dr. Naomi Landue-Oguzo, FNIQS',
    secretary: 'QS Chukwuma Elumeze, FNIQS',
    about:
      'The Rivers State Chapter of the Nigerian Institute of Quantity Surveyors serves '
      + 'registered quantity surveyors practising across Rivers State in the South South '
      + 'geopolitical zone. A twelve-member executive committee leads the chapter across '
      + 'administration, finance, public relations and research and development, working '
      + 'with the National Secretariat to deliver continuing professional development, '
      + 'uphold professional standards in construction cost management, and represent the '
      + 'profession before government, industry and the academic community in a state at '
      + "the centre of Nigeria's oil and gas construction economy. The chapter also hosts "
      + 'the Young Quantity Surveyors Forum (YQSF) and West African Quantity Surveyors '
      + 'Network coordination for Rivers.',
    heroPortrait: 'naomi-landue-oguzo',
    /* Roster from the chapter's "Rivers State Senate Members" pack, whose photo
       captions carry the names and titles. Three obvious slips in those captions
       are corrected here rather than published — "PUBLIC RELATION SECRETARY",
       "SECRETARYY" and "CORODINATOR" — and the chairman's name is taken from the
       caption burned into her own portrait. The committee's Chapter Chairmen List
       has her as "QS Naomi Sibi Landue, FNIQS", so her NEC-scope card and this
       one still disagree; reconcileChapterChairmen.js settles that.

       Twelve executives, nine portraits:
       - The Financial Secretary's and the YQSF Coordinator's files are the same
         photograph, byte for byte, of one woman. Publishing it under either name
         would be a coin flip on whose face it is, so neither card gets it until
         the chapter resends.
       - The Research & Development Secretary's photo is cropped mid-chest, and a
         suit with a lapel, white shirt and striped tie is exactly what the
         bottom extension cannot invent — it smears into a tabletop. Needs a
         fuller photograph, not a retouch. */
    roster: [
      ['naomi-landue-oguzo', 'QS Dr. Naomi Landue-Oguzo, FNIQS', 'Chapter Chairman', 1],
      ['chile-humphrey-anyawata', 'QS Chile Humphrey Anyawata, FNIQS', 'Deputy Chairman', 2],
      ['chukwuma-elumeze', 'QS Chukwuma Elumeze, FNIQS', 'General Secretary', 3],
      ['bethel-nweke', 'Mr Bethel Nweke', 'Assistant General Secretary', 4],
      ['nnenda-nwofor', 'QS Nnenda Nwofor, FNIQS', 'Treasurer', 5],
      ['mercy-adesayo-omotayo', 'QS Mercy Adesayo Omotayo, MNIQS', 'Financial Secretary', 6],
      ['obilor-romanus-amaechi', 'QS Obilor Romanus Amaechi, MNIQS', 'Public Relations Secretary', 7],
      ['tochukwu-blessed', 'QS Tochukwu Blessed, MNIQS', 'Research & Development Secretary', 8],
      ['egwuonwu-obinna-goodnews', 'QS Egwuonwu Obinna Goodnews, MNIQS', 'Ex-Officio I', 9],
      ['obiageri-juliet-asogu', 'QS Obiageri Juliet Asogu, MNIQS', 'Co-opted Member', 10],
      /* The chapter's two submissions disagree on this member's honorific: the
         committee list that seeded this roster said "Ms", the later portrait pack
         is captioned "MR. IZIDOR SMITH NWACHUKWU". Rather than pick one and risk
         addressing a member wrongly, the professional style is used — which the
         operator instructed for the bare-honorific names in this batch anyway, and
         which every other Rivers entry already carries. Worth the chapter
         confirming. */
      ['izidor-smith-nwachukwu', 'QS Izidor Smith Nwachukwu', 'YQSF Coordinator', 11],
      ['okwukwu-precious-oma', 'QS Okwukwu Precious Oma, MNIQS', 'WAQSN Coordinator', 12],
    ],
  },
  {
    key: 'bayelsa',
    chapterName: 'Bayelsa Chapter',
    state: 'Bayelsa',
    stateLabel: 'Bayelsa State',
    chairperson: 'QS Amangala Mabel Morris, FNIQS',
    secretary: 'QS Amakoromo Ebiuge James, MNIQS',
    about:
      'The Bayelsa State Chapter of the Nigerian Institute of Quantity Surveyors serves '
      + 'registered quantity surveyors practising across Bayelsa State in the South South '
      + 'geopolitical zone. A ten-member executive committee leads the chapter across '
      + 'administration, finance, public relations and professional development, working '
      + 'with the National Secretariat to deliver continuing professional development, '
      + 'uphold professional standards in construction cost management, and represent the '
      + 'profession before government, industry and the academic community across the '
      + 'creeks and coastal communities of the Niger Delta, where the cost of building is '
      + 'shaped as much by access and terrain as by the market. The chapter also hosts the '
      + 'Young Quantity Surveyors Forum (YQSF) for Bayelsa.',
    heroPortrait: 'amangala-mabel-morris',
    /* Titles are the chapter's own: "Secretary" and "Assistant Secretary" where
       most chapters say General Secretary, and the caption's "PRO" and "Secretary
       Professional development" written out. All ten portraits came, all ten are
       published — a first for a pack of candid photographs rather than studio
       shots. Three are full-length phone photos and one is a 450px-wide crop, so
       they are softer than Rivers' at full size; none needed hand work.

       Two things the chapter should confirm:
       - The Deputy Chairman is QS Larry Samuel Agorosor here. The committee's
         Chapter Chairmen List (July 2026) had QS Enize Fidelis Kenigbolo in that
         office, and he is not in the pack at all, so this publishes a change of
         officer on the strength of the chapter's own captions.
       - The chairman's name is given surname-first in the pack (Amangala Mabel
         Morris) against the committee list's Mabel Morris Amangala. The pack's
         order is used, matching how it styles everyone else. */
    roster: [
      ['amangala-mabel-morris', 'QS Amangala Mabel Morris, FNIQS', 'Chapter Chairman', 1],
      ['larry-samuel-agorosor', 'QS Larry Samuel Agorosor, MNIQS', 'Deputy Chairman', 2],
      ['amakoromo-ebiuge-james', 'QS Amakoromo Ebiuge James, MNIQS', 'Secretary', 3],
      ['dumo-silvia-sekibo', 'QS Dumo Silvia Sekibo, MNIQS', 'Assistant Secretary', 4],
      ['bunu-afini-alex', 'QS Bunu Afini Alex, MNIQS', 'Treasurer', 5],
      ['abraham-gilbert', 'QS Abraham Gilbert, MNIQS', 'Public Relations Officer', 6],
      ['adesina-fatunwase', 'QS Adesina Fatunwase, MNIQS', 'Professional Development Secretary', 7],
      ['ohwotuemuhor-omamakpor', 'QS Ohwotuemuhor Omamakpor, MNIQS', 'YQSF Coordinator', 8],
      ['iniobi-moni-edoghotu', 'QS Iniobi Moni Edoghotu, FNIQS', 'Ex-Officio I', 9],
      ['kubiat-sifon-thompson', 'QS Kubiat-Sifon Thompson, MNIQS', 'Ex-Officio II', 10],
    ],
  },
  {
    key: 'ondo',
    chapterName: 'Ondo Chapter',
    state: 'Ondo',
    stateLabel: 'Ondo State',
    chairperson: 'QS Fadiyimu Akinlolu Oyebobola, FNIQS',
    secretary: 'QS Ayinla Olasunkanmi, MNIQS',
    about:
      'The Ondo State Chapter of the Nigerian Institute of Quantity Surveyors serves '
      + 'registered quantity surveyors practising across Ondo State in the South West '
      + 'geopolitical zone. An eleven-member executive committee leads the chapter across '
      + 'administration, finance, publicity and marketing, and research and development, '
      + 'working with the National Secretariat to deliver continuing professional '
      + 'development, uphold professional standards in construction cost management, and '
      + 'represent the profession before government, industry and the academic community '
      + 'in the state. The chapter keeps its immediate past chairman on the committee and '
      + 'carries its own West African Quantity Surveyors Network representation.',
    heroPortrait: 'fadiyimu-akinlolu-oyebobola',
    /* The best-shot pack so far: eleven proper studio portraits on plain white,
       all eleven published. Two came as PNG but neither carried an alpha channel —
       photographs in a PNG wrapper, not cut-outs — so nothing took the pipeline's
       keep-the-supplied-matte path.

       Names run surname-first throughout the pack, and are published that way so
       the roster reads consistently; the committee's Chapter Chairmen List has the
       chairman the other way round (Akinlolu Oyebobola Fadiyimu). Titles are the
       chapter's, with "Secretary Publicity & Marketing" and "Secretary Research &
       Development" turned round to match how every other chapter on the site reads.

       "Ex-Officio II" is verbatim from the pack, which has no Ex-Officio I — asked
       about rather than quietly renumbered, in case a twelfth officer exists whose
       photograph simply did not come. */
    roster: [
      ['fadiyimu-akinlolu-oyebobola', 'QS Fadiyimu Akinlolu Oyebobola, FNIQS', 'Chapter Chairman', 1],
      ['osomo-fayowle', 'QS Osomo Fayowle, FNIQS', 'Deputy Chairman', 2],
      ['ayinla-olasunkanmi', 'QS Ayinla Olasunkanmi, MNIQS', 'General Secretary', 3],
      ['gbadebo-bunmi', 'QS Gbadebo Bunmi, MNIQS', 'Assistant General Secretary', 4],
      ['akinsanmi-taiwo-mary', 'QS Akinsanmi Taiwo Mary, MNIQS', 'Treasurer', 5],
      ['oganah-endurance', 'QS Oganah Endurance, MNIQS', 'Financial Secretary', 6],
      ['olanitori-morolayo-olayemi', 'QS Olanitori Morolayo-Olayemi, MNIQS', 'Publicity & Marketing Secretary', 7],
      ['jayeoba-oluyemisi', 'QS Jayeoba Oluyemisi, MNIQS', 'Research & Development Secretary', 8],
      ['olawale-ogunkua-atinuke', 'QS Olawale-Ogunkua Atinuke, MNIQS', 'WAQSN Representative', 9],
      ['momoh-temitope', 'QS Momoh Temitope, FNIQS', 'Immediate Past Chairman', 10],
      ['aina-olanrewaju', 'QS Aina Olanrewaju, MNIQS', 'Ex-Officio II', 11],
    ],
  },
  {
    key: 'kwara',
    chapterName: 'Kwara Chapter',
    state: 'Kwara',
    stateLabel: 'Kwara State',
    chairperson: 'QS Dr T. O. O. Olowa, FNIQS',
    secretary: "QS Muhammed Naja'atu, MNIQS",
    about:
      'The Kwara State Chapter of the Nigerian Institute of Quantity Surveyors '
      + 'serves registered quantity surveyors practising across Kwara State in the '
      + 'North Central geopolitical zone. A twelve-member executive committee leads '
      + 'the chapter across administration, finance, research and development and public '
      + 'relations, working with the National Secretariat to deliver continuing '
      + 'professional development, uphold professional standards in construction cost '
      + 'management, and represent the profession before government and industry in the '
      + 'state.',
    heroPortrait: 't-o-o-olowa',
    /* Twelve portraits, all clean once matted with u2net_human_seg; the general
     u2net model lost the torso on two of them. The pack titled two different
     people "Ex Officio 2". Exco is keyed (scope, chapter, title), so seeding
     that verbatim would have had the second record overwrite the first and a
     member vanish silently. Numbered I and II in pack order - CONFIRM WITH THE
     CHAPTER, the ordering is an assumption. */
    roster: [
      ['t-o-o-olowa', 'QS Dr T. O. O. Olowa, FNIQS', 'Chairman', 1],
      ['zakari-mahmud-tsaragi', 'QS Zakari Mahmud Tsaragi, FNIQS', 'Deputy Chairman', 2],
      ['muhammed-najaatu', "QS Muhammed Naja'atu, MNIQS", 'General Secretary', 3],
      ['kolawole-samuel-oluwatobi', 'QS Kolawole Samuel Oluwatobi, MNIQS', 'Assistant General Secretary', 4],
      ['abdulganiyu-sekinat-titilayo', 'QS Abdulganiyu Sekinat Titilayo, MNIQS', 'Treasurer', 5],
      ['abdulsalam-solihu-ajagba', 'QS Abdulsalam Solihu Ajagba, MNIQS', 'Financial Secretary', 6],
      ['olorunlogbon-olayemi', 'QS Olorunlogbon Olayemi, MNIQS', 'Research & Development Secretary', 7],
      ['adeoti-bashir-olanrewaju', 'QS Adeoti Bashir Olanrewaju, MNIQS', 'Public Relations Secretary', 8],
      ['afolabi-iyabo-tina', 'QS Afolabi Iyabo Tina, MNIQS', 'Ex-Officio I', 9],
      ['giwa-yusuf', 'QS Giwa Yusuf, MNIQS', 'Ex-Officio II', 10],
      ['bagbansoro-uthman', 'QS Bagbansoro Uthman, MNIQS', 'YQSF Representative', 11],
      ['idayat-oladipo', 'QS Idayat Oladipo, MNIQS', 'WAQSN Representative', 12],
    ],
  },
  {
    key: 'ogun',
    chapterName: 'Ogun Chapter',
    state: 'Ogun',
    stateLabel: 'Ogun State',
    chairperson: 'QS Esther Ola-Ade',
    secretary: 'QS Morenike Sonde',
    about:
      'The Ogun State Chapter of the Nigerian Institute of Quantity Surveyors '
      + 'serves registered quantity surveyors practising across Ogun State in the '
      + 'South West geopolitical zone. A eleven-member executive committee leads '
      + 'the chapter across administration, finance, research and development and public '
      + 'relations, working with the National Secretariat to deliver continuing '
      + 'professional development, uphold professional standards in construction cost '
      + 'management, and represent the profession before government and industry in the '
      + 'state.',
    heroPortrait: 'esther-ola-ade',
    /* Eleven portraits. The archive also carries eleven macOS "._" resource forks;
     they are not images and are skipped. Names arrive without post-nominals and
     are published as supplied. One source is too tightly cropped for the matte
     to find shoulders. */
    roster: [
      ['esther-ola-ade', 'QS Esther Ola-Ade', 'Chairman', 1],
      ['temitayo-fasasi', 'QS Temitayo Fasasi', 'Deputy Chairman', 2],
      ['morenike-sonde', 'QS Morenike Sonde', 'General Secretary', 3],
      ['lukman-adewunmi', 'QS Lukman Adewunmi', 'Assistant General Secretary', 4],
      ['olamide-okunowo', 'QS Olamide Okunowo', 'Treasurer', 5],
      ['adewunmi-adejobi', 'QS Adewunmi Adejobi', 'Financial Secretary', 6],
      ['gbemisola-akinola', 'QS Dr. Gbemisola Akinola', 'Research and Development Secretary', 7],
      ['damilola-akinyele', 'QS Damilola Akinyele', 'Publicity Relations Secretary', 8],
      ['azeez-mustapha', 'QS Azeez Mustapha', 'Welfare Secretary', 9],
      ['ifeoluwa-ogundele', 'QS Ifeoluwa Ogundele', 'YQSF Coordinator', 10],
      ['aderayo-kajebora', 'QS Aderayo Kajebora', 'WAQSN Representative', 11],
    ],
  },
  {
    key: 'niger',
    chapterName: 'Niger Chapter',
    state: 'Niger',
    stateLabel: 'Niger State',
    chairperson: 'Musa Umar Dantani',
    secretary: 'Abdullahi Ado Nakanti',
    about:
      'The Niger State Chapter of the Nigerian Institute of Quantity Surveyors '
      + 'serves registered quantity surveyors practising across Niger State in the '
      + 'North Central geopolitical zone. A ten-member executive committee leads '
      + 'the chapter across administration, finance, research and development and public '
      + 'relations, working with the National Secretariat to deliver continuing '
      + 'professional development, uphold professional standards in construction cost '
      + 'management, and represent the profession before government and industry in the '
      + 'state.',
    heroPortrait: 'musa-umar-dantani',
    /* Ten portraits, all clean. Filenames run Niger_<surname>_<first>_<role>, and no
     name in the pack carries a QS prefix or post-nominals - published exactly as
     supplied, as Katsina's bare names already are. */
    roster: [
      ['musa-umar-dantani', 'Musa Umar Dantani', 'Chairman', 1],
      ['saba-mohammed', 'Saba Mohammed', 'Deputy Chairman', 2],
      ['abdullahi-ado-nakanti', 'Abdullahi Ado Nakanti', 'General Secretary', 3],
      ['adamu-ibrahim-inyass', 'Adamu Ibrahim Inyass', 'Assistant General Secretary', 4],
      ['abdulsalam-asmau', 'Abdulsalam Asmau', 'Treasurer', 5],
      ['abdulmalik-amina', 'Abdulmalik Amina', 'Financial Secretary', 6],
      ['ayenajeyi-philemon-tolonu', 'Ayenajeyi Philemon Tolonu', 'Research & Development', 7],
      ['abubakar-akbar-azozo', 'Abubakar Akbar Azozo', 'Public Relations Officer', 8],
      ['yahaya-isah', 'Yahaya Isah', 'Ex-Officio I', 9],
      ['isah-leje-mohammed', 'Isah Leje Mohammed', 'Ex-Officio II', 10],
    ],
  },
  {
    key: 'borno',
    chapterName: 'Borno Chapter',
    state: 'Borno',
    stateLabel: 'Borno State',
    chairperson: 'QS Zanna Sumayin, FNIQS',
    secretary: 'QS Abdullahi Muhammad',
    about:
      'The Borno State Chapter of the Nigerian Institute of Quantity Surveyors '
      + 'serves registered quantity surveyors practising across Borno State in the '
      + 'North East geopolitical zone. A nine-member executive committee leads '
      + 'the chapter across administration, finance, research and development and public '
      + 'relations, working with the National Secretariat to deliver continuing '
      + 'professional development, uphold professional standards in construction cost '
      + 'management, and represent the profession before government and industry in the '
      + 'state.',
    heroPortrait: 'zanna-sumayin',
    /* Eight portraits plus a .docx reading "QS BASHIR TANKO - DEPUTY CHAIRMAN -
     PICTURE STILL OUTSTANDING", so he is on the roster without one. The pack
     titled two members "Ex Officio" with no ordinal; numbered I and II in pack
     order - CONFIRM WITH THE CHAPTER. */
    roster: [
      ['zanna-sumayin', 'QS Zanna Sumayin, FNIQS', 'Chairman', 1],
      ['bashir-tanko', 'QS Bashir Tanko', 'Deputy Chairman', 2],   // no photograph supplied
      ['abdullahi-muhammad', 'QS Abdullahi Muhammad', 'Secretary General', 3],
      ['mamman-modu-gana', 'QS Mamman Modu Gana', 'Treasurer', 4],
      ['stephen-simon', 'QS Stephen Simon', 'Financial Secretary', 5],
      ['tijani-idris', 'QS Tijani Idris', 'Secretary Education & Research', 6],
      ['dauda-wadai', 'QS Dauda Wadai', 'Public Relations Officer', 7],
      ['ibrahim-alhaji-modu', 'QS Ibrahim Alhaji Modu', 'Ex-Officio I', 8],
      ['yakubu-askarju-margima', 'QS Yakubu Askarju Margima', 'Ex-Officio II', 9],
    ],
  },
  {
    key: 'zamfara',
    chapterName: 'Zamfara Chapter',
    state: 'Zamfara',
    stateLabel: 'Zamfara State',
    chairperson: 'QS Aliyu Abdullahi, MNIQS',
    secretary: 'QS Murna Damago, MNIQS',
    about:
      'The Zamfara State Chapter of the Nigerian Institute of Quantity Surveyors '
      + 'serves registered quantity surveyors practising across Zamfara State in the '
      + 'North West geopolitical zone. A ten-member executive committee leads '
      + 'the chapter across administration, finance, research and development and public '
      + 'relations, working with the National Secretariat to deliver continuing '
      + 'professional development, uphold professional standards in construction cost '
      + 'management, and represent the profession before government and industry in the '
      + 'state.',
    heroPortrait: 'aliyu-abdullahi',
    /* Ten portraits, six clean. Four sources are tight head-and-shoulders crops the
     matte cannot recover shoulders from; they publish with the backdrop fade
     rather than a smear, but are worth re-shooting. One member is styled Mr in
     the pack and was restyled QS on the operator's instruction. */
    roster: [
      ['aliyu-abdullahi', 'QS Aliyu Abdullahi, MNIQS', 'Chairman', 1],
      ['nasiru-mainasara-mada', 'QS Nasiru Mainasara Mada, MNIQS', 'Deputy Chairman', 2],
      ['murna-damago', 'QS Murna Damago, MNIQS', 'Secretary General', 3],
      ['maryam-aliyu', 'QS Maryam Aliyu, MNIQS', 'Treasurer', 4],
      ['aminu-shuaibu', 'QS Aminu Shuaibu, MNIQS', 'Financial Secretary', 5],
      ['abdurrahman-ibrahim', 'QS Abdurrahman Ibrahim', 'PRO II', 6],
      ['kabiru-bala-idris', 'QS Kabiru Bala Idris, MNIQS', 'PRO I', 7],
      ['yahayya-s-pawa', 'QS Yahayya S Pawa, MNIQS', 'Secretary Professional Development', 8],
      ['attahiru-muhammad-maradun', 'QS Attahiru Muhammad Maradun, FNIQS', 'Ex-Officio I', 9],
      ['musa-taiwo-moyosore', 'QS Musa Taiwo Moyosore, FNIQS', 'Ex-Officio II', 10],
    ],
  },
  {
    key: 'abia',
    chapterName: 'Abia Chapter',
    state: 'Abia',
    stateLabel: 'Abia State',
    chairperson: 'QS Dr. Nwabueze M. Anosike, MNIQS',
    secretary: 'QS Chimaroke Ibeabuchi, MNIQS',
    about:
      'The Abia State Chapter of the Nigerian Institute of Quantity Surveyors '
      + 'serves registered quantity surveyors practising across Abia State in the '
      + 'South East geopolitical zone. A seven-member executive committee leads '
      + 'the chapter across administration, finance and public relations, working '
      + 'with the National Secretariat to deliver continuing professional '
      + 'development, uphold professional standards in construction cost '
      + 'management, and represent the profession before government and industry in '
      + 'the state.',
    heroPortrait: 'nwabueze-m-anosike',
    /* Seven portraits, all published. Two are wide sitting-room shots the QC gate
     flagged for a short torso; both extend into the same backdrop fade the cards
     that passed already carry, so they publish as they are.

     The committee's Chapter Chairmen List has the chairman as "QS Dr. Michael
     Nwabueze Anosike, MNIQS"; his own chapter's caption drops the Michael and
     puts the initial in the middle. The chapter's version is published, so his
     NEC-scope card and this one disagree — reconcileChapterChairmen.js settles it. */
    roster: [
      ['nwabueze-m-anosike', 'QS Dr. Nwabueze M. Anosike, MNIQS', 'Chapter Chairman', 1],
      ['ukawuba-anthony-i', 'QS Ukawuba Anthony I., MNIQS', 'Deputy Chairman', 2],
      ['chimaroke-ibeabuchi', 'QS Chimaroke Ibeabuchi, MNIQS', 'General Secretary', 3],
      ['nwagbara-nwokodimkpa', 'QS Nwagbara Nwokodimkpa', 'Assistant General Secretary', 4],
      ['ogenkwa-esther-onyinyechi', 'QS Ogenkwa Esther Onyinyechi', 'Treasurer', 5],
      ['wamah-kelechi-prince', 'QS Wamah Kelechi Prince, MNIQS', 'Financial Secretary', 6],
      ['okorie-bassey-o', 'QS Okorie Bassey O., MNIQS', 'Public Relations Secretary', 7],
    ],
  },
  {
    key: 'adamawa',
    chapterName: 'Adamawa Chapter',
    state: 'Adamawa',
    stateLabel: 'Adamawa State',
    chairperson: 'QS Benitareni Telu, MNIQS',
    secretary: 'QS Dauda Thliza Sule, MNIQS',
    about:
      'The Adamawa State Chapter of the Nigerian Institute of Quantity Surveyors '
      + 'serves registered quantity surveyors practising across Adamawa State in the '
      + 'North East geopolitical zone. A twelve-member executive committee leads '
      + 'the chapter across administration, finance, professional development and '
      + 'public relations, working with the National Secretariat to deliver '
      + 'continuing professional development, uphold professional standards in '
      + 'construction cost management, and represent the profession before '
      + 'government and industry in the state.',
    heroPortrait: 'benitareni-telu',
    /* Twelve portraits, all twelve clean. The pack titles three people simply
     "EX-OFFICIO" (one spelt "EX-OFFCIO"); numbered I, II and III in pack order —
     CONFIRM WITH THE CHAPTER, the ordering is an assumption, and Exco is keyed
     (scope, chapter, title) so identical titles would overwrite each other.

     Two names arrive without the QS prefix — Moses Junior Bulus and Queen Yusuf
     Ifitumi — and are published exactly as supplied. */
    roster: [
      ['benitareni-telu', 'QS Benitareni Telu, MNIQS', 'Chapter Chairman', 1],
      ['mahmud-babangida-aliyu', 'QS Mahmud Babangida Aliyu, MNIQS', 'Deputy Chairman', 2],
      ['dauda-thliza-sule', 'QS Dauda Thliza Sule, MNIQS', 'General Secretary', 3],
      ['moses-junior-bulus', 'Moses Junior Bulus', 'Assistant General Secretary', 4],
      ['aderonke-m-ariyo', 'QS Aderonke M. Ariyo, MNIQS', 'Treasurer', 5],
      ['queen-yusuf-ifitumi', 'Queen Yusuf Ifitumi', 'Assistant Treasurer', 6],
      ['hamza-halilu', 'QS Hamza Halilu, MNIQS', 'Financial Secretary', 7],
      ['inalegwu-ocheche', 'QS Inalegwu Ocheche, MNIQS', 'Professional Development Secretary', 8],
      ['umar-bello', 'QS Umar Bello, MNIQS', 'Public Relations Officer', 9],
      ['emmanuel-w-dzasu', 'QS Dr. Emmanuel W. Dzasu, MNIQS', 'Ex-Officio I', 10],
      ['muhammed-muawiyah', 'QS Muhammed Muawiyah, MNIQS', 'Ex-Officio II', 11],
      ['sam-alara-abiodun', 'QS Sam Alara Abiodun, MNIQS', 'Ex-Officio III', 12],
    ],
  },
  {
    key: 'akwa-ibom',
    chapterName: 'Akwa Ibom Chapter',
    state: 'Akwa Ibom',
    stateLabel: 'Akwa Ibom State',
    chairperson: 'QS Iniobong Wilson, MNIQS',
    secretary: 'QS Aloysius Essien, MNIQS',
    about:
      'The Akwa Ibom State Chapter of the Nigerian Institute of Quantity Surveyors '
      + 'serves registered quantity surveyors practising across Akwa Ibom State in the '
      + 'South South geopolitical zone. A nine-member executive committee leads '
      + 'the chapter across administration, finance, research and development, public '
      + 'relations and member welfare, working with the National Secretariat to deliver '
      + 'continuing professional development, uphold professional standards in '
      + 'construction cost management, and represent the profession before '
      + 'government and industry in the state.',
    heroPortrait: 'iniobong-wilson',
    /* Nine portraits, all nine clean. The pack arrived titled "AWKA IBOM"; the
     state is Akwa Ibom and the chapter record is named accordingly.

     Two names run shorter here than on the committee's July 2026 list — the
     chairman ("QS Iniobong Gabriel Wilson, MNIQS" there) and the deputy
     ("QS Edith Sunday Ibanga" there against QS Edith Ibang, FNIQS in her own
     chapter's caption, which also gives her post-nominals the list omits). The
     chapter's own material is published; both are worth confirming. */
    roster: [
      ['iniobong-wilson', 'QS Iniobong Wilson, MNIQS', 'Chapter Chairman', 1],
      ['edith-ibang', 'QS Edith Ibang, FNIQS', 'Deputy Chairman', 2],
      ['aloysius-essien', 'QS Aloysius Essien, MNIQS', 'General Secretary', 3],
      ['benjamin-jackson', 'QS Benjamin Jackson, MNIQS', 'Assistant General Secretary', 4],
      ['francis-udoekaebe', 'QS Francis Udoekaebe, MNIQS', 'Treasurer', 5],
      ['blessing-ibong', 'QS Blessing Ibong, MNIQS', 'Financial Secretary', 6],
      ['mbikoli-ntente', 'QS Mbikoli Ntente, MNIQS', 'Public Relations Secretary', 7],
      ['nsikak-udo', 'QS Nsikak Udo, MNIQS', 'Research & Development Secretary', 8],
      ['narrel-udombang', 'QS Narrel Udombang, MNIQS', 'Welfare Secretary', 9],
    ],
  },
  {
    key: 'bauchi',
    chapterName: 'Bauchi Chapter',
    state: 'Bauchi',
    stateLabel: 'Bauchi State',
    chairperson: 'QS Abdulhamid Mohammed, MNIQS',
    secretary: 'QS Shuaibu Adamu, MNIQS',
    about:
      'The Bauchi State Chapter of the Nigerian Institute of Quantity Surveyors '
      + 'serves registered quantity surveyors practising across Bauchi State in the '
      + 'North East geopolitical zone. A twelve-member executive committee leads '
      + 'the chapter across administration, finance, professional development and '
      + 'public relations, working with the National Secretariat to deliver '
      + 'continuing professional development, uphold professional standards in '
      + 'construction cost management, and represent the profession before '
      + 'government and industry in the state. The chapter also hosts the Young '
      + 'Quantity Surveyors Forum (YQSF) and West African Quantity Surveyors '
      + 'Network representation for Bauchi.',
    heroPortrait: 'abdulhamid-mohammed',
    /* Roster from the chapter's own "SENATE MEMBERS 2025-2027" document, which
     also settles the ordering the photo captions leave open. Two of its slips are
     fixed on the way in — "WAQSN PREPRESENTATIVE", and "SEC. PROF. DEV. & LIB."
     written out — and none of its names are.

     Twelve members, eleven portraits: no photograph came for Ex-Officio II, so
     his card renders as a monogram until one does.

     The Financial Secretary is the one person both the document and her own
     caption decline to style QS — the document gives her bare, the caption "MS.",
     so Ms is published rather than a prefix neither source claims.

     The committee's Chapter Chairmen List has the chairman the other way round
     ("QS Mohammed Abdulhamid, MNIQS"); his chapter's document and caption agree
     on Abdulhamid Mohammed, so that is published. */
    roster: [
      ['abdulhamid-mohammed', 'QS Abdulhamid Mohammed, MNIQS', 'Chairman', 1],
      ['bala-hassan', 'QS Bala Hassan, MNIQS', 'Deputy Chairman', 2],
      ['shuaibu-adamu', 'QS Shuaibu Adamu, MNIQS', 'General Secretary', 3],
      ['abdullahi-m-sanusi', 'QS Abdullahi M. Sanusi, MNIQS', 'Assistant General Secretary', 4],
      ['usman-datti-mohammad', 'QS Usman Datti Mohammad, MNIQS', 'Treasurer', 5],
      ['cynthia-onyemaobi-chizaram', 'Ms Cynthia Onyemaobi Chizaram', 'Financial Secretary', 6],
      ['ahmad-m-ahmad', 'QS Ahmad M. Ahmad, MNIQS', 'Professional Development & Library Secretary', 7],
      ['halilu-mudi-abdullahi', 'QS Halilu Mudi Abdullahi, MNIQS', 'Public Relations Officer', 8],
      ['mariya-muqaddas', 'QS Mariya Muqaddas, MNIQS', 'WAQSN Representative', 9],
      ['dahiru-abdullahi', 'QS Dahiru Abdullahi, MNIQS', 'YQSF Representative', 10],
      ['bala-barde', 'QS Bala Barde, MNIQS', 'Ex-Officio I', 11],
      ['auwal-shehu-sani', 'QS Auwal Shehu Sani, FNIQS', 'Ex-Officio II', 12],  // no photograph supplied
    ],
  },
  {
    key: 'kogi',
    chapterName: 'Kogi Chapter',
    state: 'Kogi',
    stateLabel: 'Kogi State',
    chairperson: 'QS Audu Akoji Samuel',
    secretary: 'QS Egamana Kabo Jeremiah',
    about:
      'The Kogi State Chapter of the Nigerian Institute of Quantity Surveyors '
      + 'serves registered quantity surveyors practising across Kogi State in the '
      + 'North Central geopolitical zone. A six-member executive committee leads '
      + 'the chapter across administration, finance and public relations, working '
      + 'with the National Secretariat to deliver continuing professional '
      + 'development, uphold professional standards in construction cost '
      + 'management, and represent the profession before government and industry in '
      + 'the state.',
    heroPortrait: 'audu-akoji-samuel',
    /* Six portraits, all six clean — and six is the whole pack, so this roster is
     shorter than most and may simply be the offices the chapter filled.

     Nobody in the pack carries post-nominals. The Treasurer's caption reads
     "Q Omowunmi Samuel", read as a truncated QS since every other caption in the
     pack has it — worth the chapter confirming. The PRO's caption gives no prefix
     at all and is published bare.

     "Isreal" is the chapter's own spelling and is left alone.

     The committee's Chapter Chairmen List has the chairman as "QS Samuel Akoji
     Audu, MNIQS"; the pack runs surname-first and carries no post-nominals. */
    roster: [
      ['audu-akoji-samuel', 'QS Audu Akoji Samuel', 'Chapter Chairman', 1],
      ['ogunseemi-isreal-bayo', 'QS Ogunseemi Isreal Bayo', 'Deputy Chairman', 2],
      ['egamana-kabo-jeremiah', 'QS Egamana Kabo Jeremiah', 'General Secretary', 3],
      ['mohammad-hadiza', 'QS Mohammad Hadiza', 'Assistant General Secretary', 4],
      ['omowunmi-samuel', 'QS Omowunmi Samuel', 'Treasurer', 5],
      ['onimisi-casimir', 'Onimisi Casimir', 'Public Relations Officer', 6],
    ],
  },
  {
    key: 'oyo',
    chapterName: 'Oyo Chapter',
    state: 'Oyo',
    stateLabel: 'Oyo State',
    chairperson: 'QS Oluwade Kolawole, FNIQS',
    secretary: 'QS Afe Peter, MNIQS',
    about:
      'The Oyo State Chapter of the Nigerian Institute of Quantity Surveyors '
      + 'serves registered quantity surveyors practising across Oyo State in the '
      + 'South West geopolitical zone. A fourteen-member executive committee leads '
      + 'the chapter across administration, finance, research and development, '
      + 'publicity and member welfare, working with the National Secretariat to '
      + 'deliver continuing professional development, uphold professional standards '
      + 'in construction cost management, and represent the profession before '
      + 'government, industry and the academic community in the state. The chapter '
      + 'also hosts the Young Quantity Surveyors Forum (YQSF) and West African '
      + 'Quantity Surveyors Network representation for Oyo.',
    heroPortrait: 'oluwade-kolawole',
    /* Fourteen portraits, all fourteen clean — the largest pack to come in
     without a single QC flag. Four caption typos fixed on the way in
     ("REASEARCH", "SCERETARY", "EX-OFFCIO", and the missing space in
     "HEZEKIAHOLATUNJI"); no name touched, so Ex-Officio II stays Olufunmilay
     even though it reads like a truncated Olufunmilayo. Worth confirming.

     The YQSF Representative here is QS Agboola Tolu, MNIQS. The national YQSF
     roster carries what looks like the same person as "Tolu Samuel Agboola"
     with no prefix at all — one of the 29 bare names outstanding. Oyo styling
     him QS MNIQS is the chapter contradicting that list, not confirmation. */
    roster: [
      ['oluwade-kolawole', 'QS Oluwade Kolawole, FNIQS', 'Chairman', 1],
      ['abass-adelayo', 'QS Abass Adelayo, MNIQS', 'Deputy Chairman', 2],
      ['afe-peter', 'QS Afe Peter, MNIQS', 'General Secretary', 3],
      ['oluwagbemiro-tunde-gabriel', 'QS Oluwagbemiro Tunde Gabriel, MNIQS', 'Assistant General Secretary', 4],
      ['balogun-margret', 'QS Balogun Margret, FNIQS', 'Treasurer', 5],
      ['hezekiah-olatunji', 'QS Hezekiah Olatunji, MNIQS', 'Financial Secretary', 6],
      ['leo-olagbaye-feyisetan', 'QS Dr. Leo-Olagbaye Feyisetan, FNIQS', 'Publicity Secretary', 7],
      ['ayobami-siyanbola', 'QS Ayobami Siyanbola, MNIQS', 'Research & Development Secretary', 8],
      ['ajadioni-simeon-adebusola', 'QS Ajadioni Simeon Adebusola, MNIQS', 'Welfare Secretary', 9],
      ['okeyinka-florence-mojirayo', 'QS Okeyinka Florence Mojirayo, MNIQS', 'WAQSN Representative', 10],
      ['agboola-tolu', 'QS Agboola Tolu, MNIQS', 'YQSF Representative', 11],
      ['abdulsalam-el-mubashir', 'QS Abdulsalam El-Mubashir, MNIQS', 'Ex-Officio I', 12],
      ['egbedayo-olufunmilay', 'QS Egbedayo Olufunmilay, MNIQS', 'Ex-Officio II', 13],
      ['morakinyo-victoria-mercy', 'QS Morakinyo Victoria Mercy, MNIQS', 'Co-opted Member', 14],
    ],
  },
  {
    key: 'yobe',
    chapterName: 'Yobe Chapter',
    state: 'Yobe',
    stateLabel: 'Yobe State',
    chairperson: 'QS Dikko Bakari Yerima, MNIQS',
    secretary: 'QS Bulama Gana Abatcha, MNIQS',
    about:
      'The Yobe State Chapter of the Nigerian Institute of Quantity Surveyors '
      + 'serves registered quantity surveyors practising across Yobe State in the '
      + 'North East geopolitical zone. A nine-member executive committee leads '
      + 'the chapter across administration, finance and public relations, working '
      + 'with the National Secretariat to deliver continuing professional '
      + 'development, uphold professional standards in construction cost '
      + 'management, and represent the profession before government and industry in '
      + 'the state.',
    heroPortrait: 'dikko-bakari-yerima',
    /* Nine portraits, all nine clean, and among them the chairman's — which
     closes the older of the two outstanding "chapter owes us an original photo"
     items. What was published for him until now was a low-resolution crop off a
     printed poster, pale clothing on a pale card, which no amount of model or
     parameter tuning could matte. A real photograph settled it in one pass.

     The chapter runs a deputy for both the treasurer and the financial
     secretary, and an assistant PRO, but has no research or welfare officer —
     its own structure, published as supplied. */
    roster: [
      ['dikko-bakari-yerima', 'QS Dikko Bakari Yerima, MNIQS', 'Chairman', 1],
      ['mohammad-bala-abdullahi', 'QS Mohammad Bala Abdullahi, MNIQS', 'Deputy Chairman', 2],
      ['bulama-gana-abatcha', 'QS Bulama Gana Abatcha, MNIQS', 'General Secretary', 3],
      ['abdullahi-buba', 'QS Abdullahi Buba, MNIQS', 'Treasurer', 4],
      ['muhammad-aliyu-lawan', 'QS Muhammad Aliyu Lawan, MNIQS', 'Assistant Treasurer', 5],
      ['hassan-ali-yerima', 'QS Hassan Ali Yerima, MNIQS', 'Financial Secretary', 6],
      ['olubummo-adeniyi-sola', 'QS Olubummo Adeniyi Sola, MNIQS', 'Assistant Financial Secretary', 7],
      ['ibrahim-hyelakumi', 'QS Ibrahim Hyelakumi, MNIQS', 'Public Relations Officer', 8],
      ['aliyu-shehu-mamman', 'QS Aliyu Shehu Mamman, MNIQS', 'Assistant Public Relations Officer', 9],
    ],
  },
  {
    key: 'cross-river',
    chapterName: 'Cross River Chapter',
    state: 'Cross River',
    stateLabel: 'Cross River State',
    chairperson: 'QS Victor Okon Etifit, MNIQS',
    secretary: 'QS Victor Owoeye, MNIQS',
    about:
      'The Cross River State Chapter of the Nigerian Institute of Quantity Surveyors '
      + 'serves registered quantity surveyors practising across Cross River State in the '
      + 'South South geopolitical zone. A nine-member executive committee leads the '
      + 'chapter across administration, finance and public relations, working with the '
      + 'National Secretariat to deliver continuing professional development, uphold '
      + 'professional standards in construction cost management, and represent the '
      + 'profession before government and industry in the state. The chapter also '
      + 'carries its own West African Quantity Surveyors Network representation.',
    heroPortrait: 'victor-okon-etifit',
    /* Nine executives, eight portraits published. The pack is mostly proper studio
       work — the chairman's face measures sharper than any other source received.

       Ex-Officio I carries the placeholder. Her photograph is a 481x481 candid taken
       in a car park, three times softer at the face than anything else in the pack,
       and a slab of the car behind her fuses to her neck in the matte where no crop
       can reach it. That is the secretariat's own instruction of 2026-08-05 — use the
       placeholder wherever the quality is poor — rather than a judgement call.

       This chapter styles its own roster properly, which is worth noting because it is
       the first pack to do so: two members are given Mr and Mrs with no post-nominals,
       which under the convention settled on 2026-08-04 reads as probationers, and they
       publish exactly as supplied.

       The one exception is Ex-Officio I, captioned bare but with FNIQS after it. A
       Fellow cannot be a probationer, so leaving her bare would assert something her
       own post-nominal contradicts — that is a caption slip, and QS is restored. Worth
       confirming, being the only name here not taken verbatim. */
    roster: [
      ['victor-okon-etifit', 'QS Victor Okon Etifit, MNIQS', 'Chairman', 1],
      ['idongesit-usang', 'QS Idongesit Usang, MNIQS', 'Deputy Chairman', 2],
      ['victor-owoeye', 'QS Victor Owoeye, MNIQS', 'General Secretary', 3],
      ['jenifer-asada', 'QS Dr. Jenifer Asada, MNIQS', 'Treasurer', 4],
      ['frederick-elemi', 'QS Frederick Elemi, MNIQS', 'Financial Secretary', 5],
      ['jesam-etta-otosi', 'Mr Jesam Etta Otosi', 'Public Relations Secretary', 6],
      ['winifred-edet-ekpeyong', 'Mrs Winifred Edet Ekpeyong', 'WAQSN Representative', 7],
      ['njumamaku-b-ekanem', 'QS Njumamaku B. Ekanem, FNIQS', 'Ex-Officio I', 8],  // placeholder — see above
      ['olajide-gboyega-adeoye', 'QS Olajide Gboyega Adeoye, FNIQS', 'Ex-Officio II', 9],
    ],
  },
  {
    key: 'lagos',
    chapterName: 'Lagos Chapter',
    state: 'Lagos',
    stateLabel: 'Lagos State',
    chairperson: 'QS Rilwan Balogun, FNIQS',
    secretary: 'QS Azeez Ayodabo, MNIQS',
    about:
      'The Lagos State Chapter of the Nigerian Institute of Quantity Surveyors '
      + 'serves registered quantity surveyors practising across Lagos State in the '
      + 'South West geopolitical zone, the largest concentration of the profession '
      + 'in the country. A fourteen-member executive committee leads the chapter '
      + 'across administration, finance, research and development and public '
      + 'relations, with five co-opted members, working with the National '
      + 'Secretariat to deliver continuing professional development, uphold '
      + 'professional standards in construction cost management, and represent the '
      + 'profession before government and industry in the state.',
    heroPortrait: 'rilwan-balogun',
    /* Fourteen portraits, thirteen clean. The pack mixes three name/role
       separators and abbreviates two offices ("Gen. Sec.", "Ass Gen Sec"), both
       spelled out here to match every other chapter on the site. One surname
       arrived with an underscore inside it (Adewumi_Samuel).

       The co-opted members needed renumbering. The pack states I and II, gives
       "Co-opted Member III" to two different people, and leaves a fifth
       unnumbered. Exco is keyed (scope, chapter, title), so publishing that
       verbatim would have had one record overwrite the other and a member vanish
       silently. Renumbered I-V with the stated numbers kept in place:
       QS Blessing Momodu moves III -> IV and QS Sanmi Ademuyiwa takes V.
       CONFIRM WITH THE CHAPTER - those two are assumptions.

       QS Adewumi Samuel's source is cropped too tightly for the matte to find
       shoulders; it publishes with the backdrop fade and is worth re-shooting. */
    roster: [
      ['rilwan-balogun', 'QS Rilwan Balogun, FNIQS', 'Chairman', 1],
      ['femi-falusi', 'QS Femi Falusi, FNIQS', 'Deputy Chairman', 2],
      ['azeez-ayodabo', 'QS Azeez Ayodabo, MNIQS', 'General Secretary', 3],
      ['oluwatosin-ogunsemore', 'QS Oluwatosin Ogunsemore, MNIQS', 'Assistant General Secretary', 4],
      ['saheed-dosunmu', 'QS Saheed Dosunmu, FNIQS', 'Treasurer', 5],
      ['fathia-yusuf', 'QS Fathia Yusuf, MNIQS', 'Financial Secretary', 6],
      ['fausat-ajibade', 'QS Fausat Ajibade, FNIQS', 'Research & Development Secretary', 7],
      ['john-agbezin', 'QS John Agbezin, MNIQS', 'Public Relations Secretary', 8],
      ['oluwatobiloba-akinpelu', 'QS Oluwatobiloba Akinpelu, MNIQS', 'Ex-Officio I', 9],
      ['seun-omoboyewa', 'QS Seun Omoboyewa, MNIQS', 'Co-opted Member I', 10],
      ['adewale-samson-adedotun', 'QS Adewale Samson Adedotun, MNIQS', 'Co-opted Member II', 11],
      ['adewumi-samuel', 'QS Adewumi Samuel, MNIQS', 'Co-opted Member III', 12],
      ['blessing-momodu', 'QS Blessing Momodu, MNIQS', 'Co-opted Member IV', 13],
      ['sanmi-ademuyiwa', 'QS Sanmi Ademuyiwa, MNIQS', 'Co-opted Member V', 14],
    ],
  },
  {
    key: 'enugu',
    chapterName: 'Enugu Chapter',
    state: 'Enugu',
    stateLabel: 'Enugu State',
    chairperson: 'QS Uchenna A. Nwajagu, FNIQS',
    secretary: 'QS Ifeanyi Nwogu, MNIQS',
    about:
      'The Enugu State Chapter of the Nigerian Institute of Quantity Surveyors '
      + 'serves registered quantity surveyors practising across Enugu State in the '
      + 'South East geopolitical zone. A nine-member executive committee leads the '
      + 'chapter across administration, finance, research and development, public '
      + 'relations and member welfare, working with the National Secretariat to '
      + 'deliver continuing professional development, uphold professional standards '
      + 'in construction cost management, and represent the profession before '
      + 'government and industry in the state.',
    heroPortrait: 'uchenna-a-nwajagu',
    /* Nine executives. The chairman arrives under a shorter name than the
       committee's Chapter Chairmen List carries — "QS Uchenna A. Nwajagu" against
       the list's "QS Anderson Uchenna Nwajagu" — and the chapter's own caption
       wins, as it has every time the two have disagreed. The Deputy Chairman
       gains a "Dr" the list omits, from the same source.

       The Public Relations Secretary's file arrived with his forename and surname
       run together as one word ("IFEANYICHUKWUOKOLOMIKE"). Published split, which
       is the only reading that produces two names — but it is an inference from a
       missing space rather than something the chapter wrote, so CONFIRM IT.

       "PRS" is expanded to Public Relations Secretary to match every other
       chapter. "Assistant Secretary" and "Welfare Director of Socials" are left as
       the chapter styles them: neither is a typo, they are simply this chapter's
       own offices.

       Eight portraits published of nine. The Deputy Chairman carries the
       placeholder: his is the only 600x600 file in the pack, five times softer at
       the face than anything else in it, and the matte comes back with a dark
       halo around the jacket and a ragged bite out of both shoulders that no crop
       or model change reached. That is the secretariat's instruction of
       2026-08-05 — use the placeholder wherever the quality is poor — rather than
       a judgement call. Worth asking Enugu for his original file. */
    roster: [
      ['uchenna-a-nwajagu', 'QS Uchenna A. Nwajagu, FNIQS', 'Chairman', 1],
      ['okechukwu-ekwelem', 'QS Dr Okechukwu Ekwelem, FNIQS', 'Deputy Chairman', 2],
      ['ifeanyi-nwogu', 'QS Ifeanyi Nwogu, MNIQS', 'General Secretary', 3],
      ['chibuzor-s-ogbuka', 'QS Chibuzor S. Ogbuka, MNIQS', 'Assistant Secretary', 4],
      ['obinna-g-ugwu', 'QS Obinna G. Ugwu, MNIQS', 'Treasurer', 5],
      ['ikechi-festus', 'QS Ikechi Festus, MNIQS', 'Financial Secretary', 6],
      ['henry-ajaelu', 'QS Dr. Henry Ajaelu, FNIQS', 'Research & Development Secretary', 7],
      ['ifeanyichukwuokolomike', 'QS Ifeanyichukwu Okolomike, MNIQS', 'Public Relations Secretary', 8],
      ['alloysius-ogbuagu', 'QS Alloysius Ogbuagu, MNIQS', 'Welfare Director of Socials', 9],
    ],
  },
  {
    key: 'gombe',
    chapterName: 'Gombe Chapter',
    state: 'Gombe',
    stateLabel: 'Gombe State',
    chairperson: 'QS Maryamu Arab, FNIQS',
    secretary: "QS Sa'ad Sambo Talba, MNIQS",
    about:
      'The Gombe State Chapter of the Nigerian Institute of Quantity Surveyors '
      + 'serves registered quantity surveyors practising across Gombe State in the '
      + 'North East geopolitical zone. A nine-member executive committee leads the '
      + 'chapter across administration, finance, professional development and public '
      + 'relations, working with the National Secretariat to deliver continuing '
      + 'professional development, uphold professional standards in construction '
      + 'cost management, and represent the profession before government and '
      + 'industry in the state. The chapter also carries its own West African '
      + 'Quantity Surveyors Network representation.',
    heroPortrait: 'maryamu-arab',
    /* Nine executives, led by one of the chapter chairmen who is a woman.

       The Deputy Chairman is a substitution, not a spelling: the stub seeded from
       the committee's list names QS Yusuf Ibrahim, and this pack names QS Yusuf
       Adamu. That is a different person, and the seed overwrites silently, so it
       is recorded here. CONFIRM WITH THE CHAPTER before this is treated as settled.

       Two names mirror each other — QS Yusuf Adamu is Deputy Chairman and QS Adamu
       Yusuf is Treasurer. Both are as captioned; neither is a transposition of the
       other, and they are easy to "correct" into a single person by mistake.

       The Assistant General Secretary is captioned bare, with no QS and no
       post-nominal, where every other member of this roster carries both. Under
       the convention settled on 2026-08-04 that reads as a probationer, and it
       publishes exactly as supplied rather than being tidied into the house style.

       "PUBLIC RELATION OFFICER" is corrected to Public Relations Officer, and the
       Financial Secretary's missing comma before his post-nominal restored. */
    roster: [
      ['maryamu-arab', 'QS Maryamu Arab, FNIQS', 'Chairman', 1],
      ['yusuf-adamu', 'QS Yusuf Adamu, MNIQS', 'Deputy Chairman', 2],
      ['sa-ad-sambo-talba', "QS Sa'ad Sambo Talba, MNIQS", 'General Secretary', 3],
      ['abubakar-sadiq-ahmad', 'Abubakar Sadiq Ahmad', 'Assistant General Secretary', 4],
      ['adamu-yusuf', 'QS Adamu Yusuf, MNIQS', 'Treasurer', 5],
      ['musa-ibrahim-deba', 'QS Musa Ibrahim Deba, MNIQS', 'Financial Secretary', 6],
      ['aliyu-usman', 'QS Aliyu Usman, MNIQS', 'Professional Development Secretary', 7],
      ['hassan-mustapha', 'QS Hassan Mustapha, MNIQS', 'Public Relations Officer', 8],
      ['asmau-umar-ahmed', 'QS Asmau Umar Ahmed, MNIQS', 'WAQSN Representative', 9],
    ],
  },
  {
    key: 'jigawa',
    chapterName: 'Jigawa Chapter',
    state: 'Jigawa',
    stateLabel: 'Jigawa State',
    chairperson: 'QS Dr. Usman Musa, MNIQS',
    secretary: 'QS Kabiru Usman Kiyawa, MNIQS',
    about:
      'The Jigawa State Chapter of the Nigerian Institute of Quantity Surveyors '
      + 'serves registered quantity surveyors practising across Jigawa State in the '
      + 'North West geopolitical zone. A seven-member executive committee leads the '
      + 'chapter across administration, finance and public relations, working with '
      + 'the National Secretariat to deliver continuing professional development, '
      + 'uphold professional standards in construction cost management, and '
      + 'represent the profession before government and industry in the state.',
    heroPortrait: 'usman-musa',
    /* Seven executives, the smallest roster published so far, and the only pack in
       this batch whose chairman's name matches the committee list exactly.

       The chairman also holds a seat on the National Executive Council, so his
       card exists twice — run reconcileChapterChairmen.js after this seed. Note
       the caveat in the portrait notes: the NEC and chapter-page portraits were
       composited on different backdrop fits and will not match pixel for pixel.

       "PRO" is expanded to Public Relations Officer. */
    roster: [
      ['usman-musa', 'QS Dr. Usman Musa, MNIQS', 'Chairman', 1],
      ['gali-mu-azu', "QS Gali Mu'azu, MNIQS", 'Deputy Chairman', 2],
      ['kabiru-usman-kiyawa', 'QS Kabiru Usman Kiyawa, MNIQS', 'General Secretary', 3],
      ['aminu-garba', 'QS Aminu Garba, MNIQS', 'Assistant General Secretary', 4],
      ['suleiman-aminu', 'QS Suleiman Aminu, MNIQS', 'Treasurer', 5],
      ['bala-habu-garki', 'QS Bala Habu Garki, MNIQS', 'Financial Secretary', 6],
      ['auwalu-usman', 'QS Auwalu Usman, MNIQS', 'Public Relations Officer', 7],
    ],
  },
  {
    key: 'kano',
    chapterName: 'Kano Chapter',
    state: 'Kano',
    stateLabel: 'Kano State',
    chairperson: "QS Sai'du Musa Gyadi-Gyadi, MNIQS",
    secretary: 'QS Dr. Garba Mai Unguwa Umar, FNIQS',
    about:
      'The Kano State Chapter of the Nigerian Institute of Quantity Surveyors '
      + 'serves registered quantity surveyors practising across Kano State in the '
      + 'North West geopolitical zone. A thirteen-member executive committee leads '
      + 'the chapter across administration, finance, research and product '
      + 'development and public relations, with three co-opted members carrying '
      + 'young-member and West African Quantity Surveyors Network representation, '
      + 'working with the National Secretariat to deliver continuing professional '
      + 'development, uphold professional standards in construction cost '
      + 'management, and represent the profession before government and industry '
      + 'in the state.',
    heroPortrait: 'sai-du-musa-gyadi-gyadi',
    /* Thirteen executives, the second largest roster on the site after Lagos.

       The chairman's name runs the other way round from the committee list, which
       has "QS Gyadi-Gyadi Sa'idu Musa" where the chapter writes "QS Sai'du Musa
       Gyadi-Gyadi" — a reordering *and* a different apostrophe placement in the
       forename. The chapter's own spelling is published, as with Bauchi and Kogi
       before it.

       Four captions carry the same misspelling of "Secretary" as SECRETERY and are
       corrected; "ASST." and "PROD. DEV." are expanded.

       Two titles are recorded as close to the source as they can be without
       inventing meaning. "E.C.O(TECH.)" and "E.C.O (Prof.)" are published as
       E.C.O. (Technical) and E.C.O. (Professional) — the abbreviation is not one
       any other chapter on the site uses and nothing in the pack expands it.
       "SECRETARY RESEARCH & PROD. DEV." is published as Secretary, Research &
       Product Development; "Prod." could as easily be Production, and elsewhere on
       the site the comparable office is Professional Development. ALL THREE NEED
       THE CHAPTER TO CONFIRM.

       The three co-opted seats are distinct in the source — plain, young-member and
       WAQSN — so they do not collide on the (scope, chapter, title) key the way
       Lagos's did. */
    roster: [
      ['sai-du-musa-gyadi-gyadi', "QS Sai'du Musa Gyadi-Gyadi, MNIQS", 'Chairman', 1],
      ['bashir-m-t-hotoro', 'QS Bashir M.T Hotoro, FNIQS', 'Deputy Chairman', 2],
      ['garba-mai-unguwa-umar', 'QS Dr. Garba Mai Unguwa Umar, FNIQS', 'General Secretary', 3],
      ['gambo-yayu-idris', 'QS Gambo Yayu Idris, MNIQS', 'Assistant General Secretary', 4],
      ['baffa-yahaya-sabi-u', "QS Dr Baffa Yahaya Sabi'u, MNIQS", 'Treasurer', 5],
      ['bello-abdu-gaya', 'QS Bello Abdu Gaya, MNIQS', 'Financial Secretary', 6],
      ['aminu-wada-hussain', 'QS Aminu Wada Hussain, MNIQS', 'Secretary, Research & Product Development', 7],
      ['yusuf-abdussalam-dano', 'QS Yusuf Abdussalam Dano, MNIQS', 'Public Relations Secretary', 8],
      ['auwal-abdu-dankano', 'QS Auwal Abdu Dankano, MNIQS', 'E.C.O. (Technical)', 9],
      ['rabi-u-hamza', "QS Rabi'u Hamza, MNIQS", 'E.C.O. (Professional)', 10],
      ['salisu-ahmad-baba', 'QS Salisu Ahmad Baba, MNIQS', 'Co-opted Member', 11],
      ['emmanuel-ishaku-bature', 'QS Emmanuel Ishaku Bature, MNIQS', 'Co-opted Member (Young Member)', 12],
      ['nabiyan-hamdu-zailani', 'QS Nabiyan Hamdu Zailani, MNIQS', 'Co-opted Member (WAQSN)', 13],
    ],
  },
  {
    key: 'ekiti',
    chapterName: 'Ekiti Chapter',
    state: 'Ekiti',
    stateLabel: 'Ekiti State',
    chairperson: 'QS Dr Ade-Ojo Comfort Olubunmi, FNIQS',
    secretary: 'QS Abe Adekunle, MNIQS',
    about:
      'The Ekiti State Chapter of the Nigerian Institute of Quantity Surveyors '
      + 'serves registered quantity surveyors practising across Ekiti State in the '
      + 'South West geopolitical zone. An eight-member executive committee leads the '
      + 'chapter across administration, finance, research and professional '
      + 'development, working with the National Secretariat to deliver continuing '
      + 'professional development, uphold professional standards in construction '
      + 'cost management, and represent the profession before government and '
      + 'industry in the state. The chapter is led by a Fellow of the Institute and '
      + 'carries its own West African Quantity Surveyors Network representation.',
    heroPortrait: 'ade-ojo-comfort-olubunmi',
    /* Caption-only pack (eight JPEGs, no roster document), so the order below is
       the conventional one — the captions do not rank the offices.

       The chairman and the deputy already existed as a stub seeded from the
       committee's Chapter Chairmen List, and both names differ from the chapter's
       own captions in the way the packs always differ: the chapter runs
       surname-first and carries post-nominals the list omits. The list has
       "QS Dr. Comfort Olubunmi Ade-ojo, FNIQS" and "QS Adeife Oluyemi Ajayi";
       the pack has "QS Dr Ade-Ojo Comfort Olubunmi, FNIQS" and "QS Ajayi Adeife
       Oluyemi, MNIQS". Same two people, chapter's spelling wins. The offices
       agree, which is the useful part — the list already had Ajayi as deputy.

       Titles are kept as "Chapter Chairman" and "Deputy Chairman" to match those
       stub records rather than the caption's bare "Chairman": the retire step
       deletes any chapter-scope record whose title is off this roster, and those
       two carry the phone numbers and e-mail addresses the secretariat supplied.
       Renaming the title would have thrown the contacts away.

       "Asst. General Secretary" is expanded and the R&D office takes the title
       the rest of the site already uses. Names are verbatim: "Benjami" is left
       exactly as the chapter captioned it (see QUERIES — it reads like a
       truncated Benjamin, but that is theirs to confirm, not mine to correct),
       and so are the bare initials in "Adebayo B. O". */
    roster: [
      ['ade-ojo-comfort-olubunmi', 'QS Dr Ade-Ojo Comfort Olubunmi, FNIQS', 'Chapter Chairman', 1],
      ['ajayi-adeife-oluyemi', 'QS Ajayi Adeife Oluyemi, MNIQS', 'Deputy Chairman', 2],
      ['abe-adekunle', 'QS Abe Adekunle, MNIQS', 'General Secretary', 3],
      ['kolawole-sunday-benjami', 'QS Kolawole Sunday Benjami, MNIQS', 'Assistant General Secretary', 4],
      ['lydia-opeyemi-oni', 'QS Lydia Opeyemi Oni, MNIQS', 'Treasurer', 5],
      ['olanbiwonnu-olayide', 'QS Olanbiwonnu Olayide, MNIQS', 'Financial Secretary', 6],
      ['adebayo-b-o', 'QS Adebayo B. O, MNIQS', 'Research & Development Secretary', 7],
      ['oluwaseyi-olufadeji', 'QS Oluwaseyi Olufadeji, MNIQS', 'WAQSN Coordinator', 8],
    ],
  },
  {
    key: 'sokoto',
    chapterName: 'Sokoto Chapter',
    state: 'Sokoto',
    stateLabel: 'Sokoto State',
    chairperson: 'QS Umar Sule, FNIQS',
    secretary: 'QS Muhammad-Jamil Abubakar, MNIQS',
    about:
      'The Sokoto State Chapter of the Nigerian Institute of Quantity Surveyors '
      + 'serves registered quantity surveyors practising across Sokoto State in the '
      + 'North West geopolitical zone. A ten-member executive committee leads the '
      + 'chapter across administration, finance, research and professional '
      + 'development, working with the National Secretariat to deliver continuing '
      + 'professional development, uphold professional standards in construction '
      + 'cost management, and represent the profession before government and '
      + 'industry in the state. The chapter is led by a Fellow of the Institute and '
      + 'carries two representatives to the West African Quantity Surveyors Network.',
    heroPortrait: 'umar-sule',
    /* The pack arrived captioned "KEBBI-SOKOTO CHAPTER" but is Sokoto's: its
       Chairman and Deputy Chairman are the two people already on the Sokoto stub
       (QS Sule Umar / QS Faruku Maliki), and the Kebbi record is empty with no
       chairman of its own. Whether Kebbi is meant to share this roster is a
       question for the secretariat — see QUERIES — and until it is answered
       nothing is written to Kebbi.

       The chairman's name is the chapter's own order, QS Umar Sule, against the
       committee list's QS Sule Umar. Same person, and the chapter's spelling wins
       as it always does.

       The photograph published on this page as the Chairman was never the
       Chairman: the secretariat confirmed on 2026-08-18 that it is the General
       Secretary, and comparing it against this pack face by face agrees — it is
       QS Muhammad-Jamil Abubakar. Both men have their own portrait here, so the
       mislabelling is corrected by publishing rather than by moving the old file.

       Rilwanu Bello is captioned with no QS where every other member carries one,
       yet also carries FNIQS, which a probationer cannot hold. The two signals
       contradict each other, so the name publishes exactly as supplied and the
       contradiction goes to the chapter — see QUERIES.

       "Ex - Officio" is closed up and the two WAQSN seats numbered, since Exco is
       keyed on (scope, chapter, title) and two identical titles would overwrite
       each other. The pack has no Financial Secretary. */
    roster: [
      ['umar-sule', 'QS Umar Sule, FNIQS', 'Chapter Chairman', 1],
      ['faruku-maliki', 'QS Faruku Maliki, MNIQS', 'Deputy Chairman', 2],
      ['muhammad-jamil-abubakar', 'QS Muhammad-Jamil Abubakar, MNIQS', 'General Secretary', 3],
      ['isyaku-shagari-abdulhamid', 'QS Isyaku Shagari Abdulhamid, MNIQS', 'Assistant General Secretary', 4],
      ['chika-dikko', 'QS Chika Dikko, MNIQS', 'Treasurer', 5],
      ['abdullahi-nuhu-jega', 'QS Abdullahi Nuhu Jega, MNIQS', 'Research & Development Secretary', 6],
      ['rilwanu-bello', 'Rilwanu Bello, FNIQS', 'Public Relations Officer', 7],
      ['usman-shehu', 'QS Usman Shehu, MNIQS', 'Ex-Officio', 8],
      ['ibrahim-maryam-namadina', 'QS Ibrahim Maryam Namadina, MNIQS', 'WAQSN Representative I', 9],
      ['lydia-jonathan', 'QS Lydia Jonathan, MNIQS', 'WAQSN Representative II', 10],
    ],
  },
  {
    key: 'anambra',
    chapterName: 'Anambra Chapter',
    state: 'Anambra',
    stateLabel: 'Anambra State',
    chairperson: 'QS Oduenyi Donatus Chidi, MNIQS',
    secretary: 'QS Akudoro Nnaemeka, MNIQS',
    about:
      'The Anambra State Chapter of the Nigerian Institute of Quantity Surveyors '
      + 'serves registered quantity surveyors practising across Anambra State in the '
      + 'South East geopolitical zone. An eight-member executive committee leads the '
      + 'chapter across administration, finance and public relations, working with '
      + 'the National Secretariat to deliver continuing professional development, '
      + 'uphold professional standards in construction cost management, and represent '
      + 'the profession before government and industry in the state.',
    heroPortrait: 'oduenyi-donatus-chidi',
    /* Captions arrived in capitals and are set in title case here; the names
       themselves are the chapter's, unchanged.

       The Deputy Chairman is a substitution, not a spelling. The stub seeded from
       the committee's list names QS Emmanuel Okechukwu Nwankwo; this pack names
       QS Chukwuemerie Emmanuel Okechukwu. The given names match and the surname
       does not, so it is either a different person or a correction the list never
       received. The seed overwrites silently, so it is recorded in QUERIES.
       CONFIRM WITH THE CHAPTER.

       The chairman is the same man either way, surname-first as the chapter
       writes him. "PRO" is expanded to Public Relations Officer. */
    roster: [
      ['oduenyi-donatus-chidi', 'QS Oduenyi Donatus Chidi, MNIQS', 'Chapter Chairman', 1],
      ['chukwuemerie-emmanuel-okechukwu', 'QS Chukwuemerie Emmanuel Okechukwu, MNIQS', 'Deputy Chairman', 2],
      ['akudoro-nnaemeka', 'QS Akudoro Nnaemeka, MNIQS', 'General Secretary', 3],
      ['nwobu-ifeanyi', 'QS Nwobu Ifeanyi, MNIQS', 'Assistant General Secretary', 4],
      ['anosike-ifeoma', 'QS Anosike Ifeoma, MNIQS', 'Treasurer', 5],
      ['onwuvunka-emmanuel', 'QS Onwuvunka Emmanuel, MNIQS', 'Financial Secretary', 6],
      ['obiano-vivian-chikaodili', 'QS Obiano Vivian Chikaodili, MNIQS', 'Public Relations Officer', 7],
      ['madueke-chiedu', 'QS Madueke Chiedu, MNIQS', 'Ex-Officio', 8],
    ],
  },
  {
    key: 'plateau',
    chapterName: 'Plateau Chapter',
    state: 'Plateau',
    stateLabel: 'Plateau State',
    chairperson: 'QS Nuhu Machunga, MNIQS',
    secretary: 'QS Samuel Dawam, MNIQS',
    about:
      'The Plateau State Chapter of the Nigerian Institute of Quantity Surveyors '
      + 'serves registered quantity surveyors practising across Plateau State in the '
      + 'North Central geopolitical zone. A seven-member executive committee leads '
      + 'the chapter across administration, finance and public relations, working '
      + 'with the National Secretariat to deliver continuing professional '
      + 'development, uphold professional standards in construction cost management, '
      + 'and represent the profession before government and industry in the state.',
    heroPortrait: 'nuhu-machunga',
    /* Two portraits are deliberately absent, under the placeholder rule the
       secretariat set on 2026-08-05.

       The Public Relations Officer's source is a photograph of a printed
       photograph: it mattes as a rectangular slab with the original's green
       background band still attached, and re-running it under u2net rather than
       u2net_human_seg removed the band but not the straight cut edges. The
       Treasurer's is a good likeness whose patterned top smears into vivid red,
       blue and yellow streaks where the matte fades out; both models produce it,
       so it is the source, not the model. Replacements are requested in QUERIES.

       The Financial Secretary arrived as a PDF rather than an image -- a phone
       scan, 2448x3264, extracted from it. His caption is the one file in the pack
       carrying neither QS nor a post-nominal, where every other member has both.
       Under the convention settled on 2026-08-04 that reads as a probationer, and
       he publishes exactly as supplied rather than being tidied into house style.

       The chairman is "QS Nuhu Machunga" here against the committee list's
       "QS Nuhu Zawa Machunga"; the chapter's shorter version wins, as it has in
       every pack that disagreed with the list. */
    roster: [
      ['nuhu-machunga', 'QS Nuhu Machunga, MNIQS', 'Chapter Chairman', 1],
      ['abdulrazak-mohammed', 'QS Abdulrazak Mohammed, MNIQS', 'Deputy Chairman', 2],
      ['samuel-dawam', 'QS Samuel Dawam, MNIQS', 'General Secretary', 3],
      ['luka-agwom', 'QS Luka Agwom, MNIQS', 'Assistant General Secretary', 4],
      ['panmwa-gupai', 'QS Panmwa Gupai, MNIQS', 'Treasurer', 5],
      ['abdulwahab-nasirdeen-garba', 'Abdulwahab Nasirdeen Garba', 'Financial Secretary', 6],
      ['nentawe-gobur', 'QS Nentawe Gobur, MNIQS', 'Public Relations Officer', 7],
    ],
  },
  {
    key: 'imo',
    chapterName: 'Imo Chapter',
    state: 'Imo',
    stateLabel: 'Imo State',
    chairperson: 'QS Dr. Amuda Ogochukwu, FNIQS',
    secretary: 'QS Dr. Ejekwu Tobechi, MNIQS',
    about:
      'The Imo State Chapter of the Nigerian Institute of Quantity Surveyors '
      + 'serves registered quantity surveyors practising across Imo State in the '
      + 'South East geopolitical zone. A nine-member executive committee leads the '
      + 'chapter across administration, finance, welfare and professional '
      + 'development, working with the National Secretariat to deliver continuing '
      + 'professional development, uphold professional standards in construction '
      + 'cost management, and represent the profession before government and '
      + 'industry in the state. The chapter is led by a Fellow of the Institute and '
      + 'carries its own Young Quantity Surveyors Forum coordination.',
    /* Roster text only -- no heroPortrait, and run with --no-photos.

       The pack is a single .docx with nine photographs embedded in it, and two
       separate problems make them unpublishable as they stand.

       They are 213x284 to 290x398, about a quarter of what the cards need, the
       same as the Ekiti pack.

       More seriously, the document does not say which photograph belongs to whom.
       Word lays them out in groups of one, two, four and two, while the captions
       name people in groups of three, so the two sequences cannot be aligned.
       Guessing would put a real person's face under another person's name, so
       none is used. Individually named, full-size files would settle both -- see
       QUERIES.

       "QS." is regularised to "QS" and a comma restored before each post-nominal;
       "Cordinator" is corrected. Names are otherwise verbatim, including the
       Treasurer's "MNQIS", which is a post-nominal and so not mine to correct, and
       the YQSF Coordinator's bare name. "SPDL" is the chapter's own title for the
       sixth seat and is published as given -- it is queried, not guessed at. */
    roster: [
      ['amuda-ogochukwu', 'QS Dr. Amuda Ogochukwu, FNIQS', 'Chapter Chairman', 1],
      ['ihezie-dennis-n', 'QS Ihezie Dennis N., MNIQS', 'Deputy Chairman', 2],
      ['ejekwu-tobechi', 'QS Dr. Ejekwu Tobechi, MNIQS', 'Secretary General', 3],
      ['ohamma-victor', 'QS Dr. Ohamma Victor, MNIQS', 'Welfare Secretary', 4],
      ['victor-agbasonu', 'QS Victor Agbasonu, MNIQS', 'Financial Secretary', 5],
      ['rex-ugulu', 'QS Dr. Rex Ugulu, MNIQS', 'SPDL', 6],
      ['egbujor-jane', 'QS Egbujor Jane, MNQIS', 'Treasurer', 7],
      ['newton-i-j-onwusonye', 'QS Newton I.J Onwusonye, MNIQS', 'Public Relations Officer', 8],
      ['mbamaonyeukwu-prisca-chiamaka', 'Mbamaonyeukwu Prisca Chiamaka', 'State YQSF Coordinator', 9],
    ],
  },
];

(async () => {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 20000 });
  console.log('Connected.\n');

  const only = process.argv.slice(3).filter(a => !a.startsWith('--')).map(s => s.toLowerCase());
  const selected = only.length ? CHAPTERS.filter(c => only.includes(c.key)) : CHAPTERS;
  const unknown = only.filter(k => !CHAPTERS.some(c => c.key === k));
  if (unknown.length) { console.error(`unknown chapter key(s): ${unknown.join(', ')}`); process.exit(2); }

  for (const c of selected) {
    const chapter = await Chapter.findOne({ name: c.chapterName });
    if (!chapter) { console.warn(`!! no chapter document for ${c.chapterName}`); continue; }

    console.log(`── ${c.chapterName} ──`);
    const urls = {};

    for (const [slug, name, title, order] of c.roster) {
      let storage = 'text only';
      if (!noPhotos) {
        /* A roster entry whose portrait is absent still gets its text written —
           only the photo is skipped. That is what --no-photos means, and it is
           also what a partial pack needs: when a chapter resends eight of ten
           portraits, the other two must keep the images they already have
           without their names and order going unwritten. */
        const file = path.join(portraitsDir, c.key, `${c.key}-${slug}.jpg`);
        if (!fs.existsSync(file)) {
          console.warn(`   !! missing portrait ${file} — text only`);
        } else {
          const buffer = fs.readFileSync(file);
          const stored = await storeBuffer({
            buffer, originalname: `${c.key}-${slug}.jpg`, mimetype: 'image/jpeg', size: buffer.length,
          });
          urls[slug] = stored.url;
          storage = stored.storage;
        }
      }

      await Exco.findOneAndUpdate(
        { scope: 'chapter', chapter: chapter._id, title },
        {
          name, title, scope: 'chapter', chapter: chapter._id, state: c.stateLabel,
          order, isActive: true, ...(urls[slug] ? { image: urls[slug] } : {}),
        },
        { upsert: true },
      );
      console.log(`   ${storage.padEnd(10)} ${String(order).padStart(2)}. ${title} — ${name}`);
    }

    /* Retire any stale chapter-scope record that is no longer on the roster
       (e.g. an older "Deputy Chairman" title replaced by "Vice Chairman"). */
    const keepTitles = c.roster.map(([, , title]) => title);
    const stale = await Exco.deleteMany({
      scope: 'chapter', chapter: chapter._id, title: { $nin: keepTitles },
    });
    if (stale.deletedCount) console.log(`   removed ${stale.deletedCount} stale exco record(s)`);

    await Chapter.updateOne({ _id: chapter._id }, {
      about: c.about,
      ...(c.address ? { address: c.address } : {}),
      chairperson: c.chairperson,
      secretary: c.secretary,
      ...(urls[c.heroPortrait] ? { image: urls[c.heroPortrait] } : {}),
    });
    console.log(`   chapter profile updated (${c.roster.length} executives)\n`);
  }

  await mongoose.disconnect();
  console.log('Done.');
})().catch((e) => { console.error(e); process.exit(1); });
