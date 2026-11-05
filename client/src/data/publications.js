/**
 * Publications and branded items the Institute sells, with prices in naira,
 * as listed in the Secretariat's NIQS PUBLICATIONS.xlsx (Drive, MATERIAL -
 * BATCH 2, Oct 2026). Titles are the sheet's own; obvious typing slips in the
 * sheet are corrected (IMPERATIVES, ENVIRONMENTAL, PRIVATISATION, GDE).
 */
export const PUBLICATIONS = [
  ['BESMM4 Revised Edition', 15000],
  ['Standard Form of Contract (NCI)', 5000],
  ['Design & Build (NCI)', 5000],
  ['Building Information Modelling (BIM)', 5000],
  ['NIQS Constitution', 5000],
  ['Measurement and Cost Mgt. of Eng. Inf. Projects', 6000],
  ['Measurement of Building Works (Amuda-Yusuf)', 10000],
  ['Measurement of Construction Work Quantities', 5000],
  ['Standard Method of Resource Scheduling 1 (SMRS 1)', 3000],
  ['Project Planning in the Construction Industry (SIJ)', 3000],
  ['Socio-Economic Imperatives of Environmental Impact Assessment for Development Projects (Dr. Okereke)', 10000],
  ['Tendering and Estimating (Onwusonye)', 10000],
  ['Pathfinder (TPC)', 20000],
  ['Pathfinder (GDE)', 20000],
  ['History Book (Hard Cover)', 20000],
  ['History Book (Soft Cover)', 15000],
  ["Consol's Price Book 2019 (7th Edition)", 10000],
  ["Consol's Price Book 2026 - Builders & Developers (8th Ed.)", 15000],
  ["Consol's Price Book June, 2022 Nigeria Civil Engineering & Infrastructure (1st Edition)", 15000],
  ['Value for Money (Dr. Ogunsemi)', 1500],
  ['Handbook on Project Procurement', 500],
  ['Budgetary Planning for Capital Projects', 2500],
  ['Building Block for National Development', 2500],
  ['Environmental Impact and Assessment', 2500],
  ['Open and Competitive Tendering in the Procurement', 2500],
  ['Privatisation & Commercialisation of Public Enterprise', 2500],
  ['Quantity Surveyor and Total Cost Management', 2500],
  ['Ethical Issues & the Challenges in Construction', 1500],
  ['Book of Abstract RECON 1', 3000],
  ['NIQS 1st Research Conference Proceedings (Sept. 2013)', 5000],
  ['NIQS 2nd Research Conference Proceedings (Sept. 2015)', 7500],
  ['NIQS 3rd Research Conference Proceedings (Sept. 2017)', 7500],
  ['NIQS 4th Research Conference Proceedings (Sept. 2019)', 7500],
  ['QS Journal Vol 65 to Vol 71 - cost per edition', 5000],
].map(([title, price]) => ({ title, price }));

export const BRANDED_ITEMS = [
  ['NIQS T-Shirt (Polo)', 12000],
  ['NIQS Face Cap', 7000],
  ['Customised Pen', 6000],
  ['Note Pad', 8000],
  ['Magic Mug', 5000],
  ['Door Sticker - Member (Big)', 2000],
  ['Door Sticker - Member (Small)', 1000],
  ['Car Sticker (Big)', 2000],
  ['Car Sticker (Small)', 1000],
  ['Lapel Pin (Fellow)', 7500],
  ['Lapel Pin (Member)', 7500],
  ['NIQS Branded Bag', 5000],
  ['NIQS Tie - Blue (Rebranded Logo)', 5000],
].map(([title, price]) => ({ title, price }));

export const naira = (n) => `₦${n.toLocaleString('en-NG')}`;
