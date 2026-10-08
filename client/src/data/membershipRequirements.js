/* Membership categories and their requirements, word for word from the
   Institute's previous website (the review, Oct 2026, asked for the old
   per-category layout back: "when you click on each of them it gives you the
   requirements"). Fees and the old hard-copy/flash-drive submission steps are left out: the
   old fees may be out of date, and applications are online now and the Secretariat's membership officer is
   updating this text. Replace it here when that arrives; do not paraphrase.

   Block kinds: p (paragraph), pb (bold paragraph), h (sub-heading),
   ol / ul (lists; an item may be { text, sub: [...] }). */
const MEMBERSHIP_REQUIREMENTS = [
  {
    "tab": "Fellow",
    "title": "Fellows",
    "blocks": [
      {
        "pb": "A prospective Fellow shall be a financial Member of the Institute who has fulfilled the following conditions;"
      },
      {
        "ol": [
          "He shall have been elected by the Institute as a full member for at least ten (10) years.",
          "He shall have held a responsible position for not less than ten (10) years and has attained the age of 40 years.",
          "He shall have participated actively in the affairs of the Institute at the National and State Chapter levels.",
          "He shall have presented at Seminars or workshops, or conferences organized at National or Chapters level or published or publishable by The Nigerian Institute of Quantity Surveyors editorial board, a minimum of 2 (Two) papers/articles on matters relating to Quantity Surveying/Construction Industry.",
          "He shall have been benevolent to the Institute by financial support or other philanthropic gestures or services on a continuous basis.",
          "He must not have been adjudged guilty or bankrupt by any court of law or previously suspended or expelled for misconduct by the Institute.",
          "He must show evidence that his membership of the Quantity Surveyors Registration Board of Nigeria is current and up to date financially.",
          "He must show evidence that his membership of the Nigerian Institute of Quantity Surveyors is current and up to date financially.",
          "He must have accumulated a minimum of 300 CPD points.",
          "He must have shown evidence of active professional practice in the industry.",
          {
            "text": "The applicant photograph size (460 X 300 px) and a page citation under the following headings:",
            "sub": [
              "Academic and professional qualification",
              "Status in Organisations",
              "Major and high profile Quantity Surveying projects handled",
              "Appointment to major/high profile Boards, National committees",
              "Other professional achievement and political relevance."
            ]
          }
        ]
      },
      {
        "p": "All applications shortlisted for upgrading shall be forwarded to the Fellows' Forum for screening and subsequent recommendations to the NEC."
      }
    ]
  },
  {
    "tab": "Member",
    "title": "Member",
    "blocks": [
      {
        "ul": [
          "Those who have passed the written Test of Professional Competence (TPC), Diaries and Logbook Assessment and Professional Competence Interview of the Institute and have been elected to the grade.",
          "Or any other acceptable foreign qualification and after passing any necessary interview by the National Executive Council.",
          "Persons whose election by reason of what the National Executive Council considers to be by his exceptional professional attainments and distinctions which would be of real advantages to the Institute and shall be not less than 50 years of age and shall attend and pass an interview conducted by the National Executive Council."
        ]
      },
      {
        "h": "Requirements:"
      },
      {
        "ol": [
          "Probationer/Technician who have passed Matured Route Interview or Professional Competence Interview and logbook assessment.",
          "60/100 Continuous Professional Development (CPD Units) for PCI and Matured Route applicants respectively.",
          "Five (5) O'Level Credits in English Language, Mathematics, Physics (mandatory) and other 2 from (Chemistry, Further Mathematics, Economics, Commerce, Geography, Technical Drawing, Biology)",
          "All credentials enclosed must be endorsed by the referees who should be financially up-to-date with the Institute. Statement of result is not acceptable for upgrade."
        ]
      }
    ]
  },
  {
    "tab": "Honorary Fellow",
    "title": "Honorary Membership",
    "blocks": [
      {
        "p": "Prospective Honorary Fellow shall be persons who are not Quantity Surveyors by profession but who have by their actions contributed immensely to the achievement of the aims and objectives of the Institute and have been nominated by the National Policy Committee for an honorary membership as a Fellow in recognition of their contribution. Such members may only use the designatory letters “Hon. Fellow”"
      }
    ]
  },
  {
    "tab": "Probationer",
    "title": "Probationer",
    "blocks": [
      {
        "p": "Quantity Surveying Degree holders who are engaged solely in quantity surveying duties under the supervision of a Registered Quantity Surveyor. They shall be eligible to sit the Institute's Test of Professional Competence Examination."
      },
      {
        "p": "Quantity Surveying Higher National Diploma holders who are engaged solely in quantity surveying duties under the supervision of a Registered Quantity Surveyor. They shall be eligible to sit the Institute's Graduateship Professional Examination."
      },
      {
        "h": "Requirements:"
      },
      {
        "ol": [
          "B.Sc., B/Tech /HND Quantity Surveying",
          "5 O'Level Credits in English Language, Mathematics, Physics (mandatory) and other 2 from (Chemistry, Further Mathematics, Economics, Commerce, Geography, Technical Drawing, Biology)",
          "All credentials enclosed must be endorsed by the referees who should be financially-up-to-date with the Institute."
        ]
      }
    ]
  },
  {
    "tab": "Technician",
    "title": "Technician",
    "blocks": [
      {
        "p": "Cognate Degree holders of kindred professional bodies in the built environment Industry and who are engaged solely in quantity surveying duties under the supervision of a Registered Quantity Surveyor but do not meet the requirement for admission into any other grades of membership. They shall be eligible to sit the Institute's appropriately prescribed Examination."
      },
      {
        "h": "Requirements:"
      },
      {
        "ol": [
          "B.Sc./HND from Allied profession (Building, Civil etc)",
          "5 O'Level Credits in English Language, Mathematics, Physics (mandatory) and other 2 from (Chemistry, Further Mathematics, Economics, Commerce, Geography, Technical Drawing, Biology)",
          "All credentials enclosed must be endorsed by the referees who should be financially-up-to-date with the Institute."
        ]
      }
    ]
  },
  {
    "tab": "Student",
    "title": "Student",
    "blocks": [
      {
        "p": "Students shall be persons who have passed Senior Secondary School Certificate Examination or General Certificate of Education (Ordinary Level) as conducted by the West African examinations Council (WAEC) or National Examinations Council (NECO), with a credit in at least 5 (five) papers including English Language, Mathematics, Physics and any other two relevant subjects. Or persons who are undergoing a course of study or training in approved Institutions or professional office or Qualified Member organization in Quantity Surveying."
      },
      {
        "h": "Requirements:"
      },
      {
        "ol": [
          "Letter of Admission should be attached.",
          "Forms must be signed by the school Head of Department and stamped."
        ]
      }
    ]
  },
  {
    "tab": "Firm",
    "title": "Practice Firm",
    "blocks": [
      {
        "p": "The following are the requirements for registration of Quantity Surveying practice firm:"
      },
      {
        "ol": [
          "Certificate of Incorporation from CAC",
          "Form 2 or 7 from CAC",
          "NIQS & QSRBN Diploma Certificates",
          "5 Years post MNIQS experience",
          "CV of the Principal Partner & other Partner(s) if any.",
          "All credentials enclosed must be endorsed by the referees who should be financially up-to-date with the Institute.",
          "Either Business Name or Firms limited by Shares are registrable.",
          "Evidence of minimum of 100units of CPD.",
          "The Partner(s) must be financially up-to-date with the Institute."
        ]
      }
    ]
  },
  {
    "tab": "Affiliate",
    "title": "Corporate Affiliate",
    "blocks": [
      {
        "p": "The NIQS has unveiled the registration of Corporate Affiliate membership which is open to Construction Companies, Property Development Companies, Specialist Building Products Companies, Manufacturers, Suppliers, Banks and Consulting firms."
      },
      {
        "h": "Requirements:"
      },
      {
        "ol": [
          "At least Three (3) NIQS registered Members on the Firm's Staff list.",
          "Three (3) years Tax Clearance Certificate.",
          "Company Profile including Certificate of Incorporation, Memorandum and Articles of Association, Particulars of Directors and Shareholders, CV and credentials of Directors and staff etc.",
          "Verifiable evidence of benevolence to the Institute by way of financial support or by way of other Corporate Social Responsibilities."
        ]
      },
      {
        "pb": "Some Benefits of Subscription."
      },
      {
        "ul": [
          "Free Conference proceedings for the MD/CEO.",
          "Opportunity to participate in NIQS activities and promote Quantity Surveying/Total Cost Management.",
          "Official recognition at NIQS activities.",
          "Invitation to NIQS President's Business Luncheon.",
          "Opportunities for Business Networking.",
          "Possible direct or indirect patronage by the Institute."
        ]
      }
    ]
  }
];

export default MEMBERSHIP_REQUIREMENTS;
