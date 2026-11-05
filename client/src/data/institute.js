/**
 * The Institute's own words, shared by the Home and About pages so the two can
 * never drift apart (NIQS review, 4 Nov 2026: the Home page opens with the
 * first paragraph of About's "Our Story", shows three of the services and the
 * Vision, Mission and Value, each linking to the full text on About).
 */

/* "Our Story" on About, paragraph by paragraph. Home shows the first only. */
export const OUR_STORY = [
  'The Nigerian Institute of Quantity Surveyors was founded in 1969 by a group of Nigerians who trained, qualified and practiced in the United Kingdom but who, upon returning to Nigeria, sensed the urgent need to develop the profession of Quantity Surveying in Nigeria by establishing a parallel body to the Royal Institution of Chartered Surveyors of the United Kingdom.',
  'The profession of Quantity Surveying is practiced in Nigeria along the same pattern as in the United Kingdom and other Commonwealth countries. In America, they are known as Cost Engineers, and Quantity Surveying functions are carried out in other countries under a variety of names — the role is universal.',
];

/* The Institute's own list of quantity surveying services, word for word as
   the Secretariat supplied it (Oct 2026), in its order. Titles are in title
   case; the descriptions are theirs and are not paraphrased. */
export const services = [
  { icon: 'costManagement', title: 'Construction Cost Experts', desc: "Professional who apply specialized knowledge and skills to predict, plan, control, and minimize construction costs, ensuring optimal resource allocation, risk management, and value for money throughout a project's lifecycle, from inception to completion." },
  { icon: 'chart', title: 'Feasibility Study of Capital Projects', desc: "Conducting of comprehensive assessment to determine a project's viability, potential for success, and practicality before significant resources are committed." },
  { icon: 'technology', title: 'Cost Modelling', desc: 'The systematic representation of construction costs in relation to design, function, and performance variables, used to forecast, control, and optimize expenditure throughout the project lifecycle.' },
  { icon: 'procurement', title: 'Procurement Management', desc: 'The structured process of planning, selecting, and administering the acquisition of goods, services, and construction works to deliver a project efficiently, cost-effectively, and in compliance with contractual and regulatory requirements.' },
  { icon: 'handshake', title: 'PPP Transaction Advisory Services', desc: 'A specialized consultancy services that guide public authorities and private investors through the entire lifecycle of a Public–Private Partnership (PPP) project, from feasibility analysis and procurement strategy to contract negotiation and financial closure.' },
  { icon: 'task', title: 'Project Management', desc: 'An organized approach to initiating, planning, executing, monitoring, and controlling project activities to achieve specific project objectives, ensuring efficient use of resources, time, and cost, while meeting stakeholder expectations.' },
  { icon: 'idea', title: 'Value Engineering & Management', desc: 'The systematic and structured methodology that analyzes the functions of a project, product, or service to achieve those functions at the lowest possible cost without compromising quality, performance, or reliability.' },
  { icon: 'legal', title: 'Construction Arbitration and Mediation', desc: 'Act as a cost and contract expert—providing evidence, valuations, claims analysis, and advisory input—to support fair resolution of disputes, whether through formal arbitration or amicable mediation.' },
  { icon: 'shield', title: 'Risk Management', desc: "A logical process of identifying, analyzing, and responding to project uncertainties to protect the project's financial and contractual health." },
  { icon: 'certificate', title: 'Reinstatement Cost Assessment for Insurance Purposes', desc: 'Evaluates the total expense required to rebuild or repair a damaged property to its original condition. Prepared for insurance purposes, it ensures the sum insured accurately reflects current reconstruction costs, preventing underinsurance and guaranteeing adequate coverage during a claim.' },
  { icon: 'target', title: 'Project Control and Monitoring', desc: 'The methodical process of tracking, evaluating, and regulating construction project performance in terms of cost, time, and quality to ensure that the project objectives are achieved.' },
  { icon: 'contract', title: 'Construction Contract/Technical Auditing', desc: 'Refers to the detailed review and evaluation of construction contracts, project documentation, and technical processes to ensure compliance with contractual obligations, financial accuracy, and industry standards.' },
];

/* Vision, Mission and Value word for word as on the previous NIQS website:
   at the October 2026 review the Secretariat asked to keep those statements
   until council adopts new ones, so they are not to be paraphrased here. */
export const principles = [
  {
    icon: 'eye',
    label: 'Our Vision',
    title: 'Total Cost & Procurement Management',
    body: "To be the profession in Nigeria responsible for total cost and procurement management, for the achievement of client's objectives in all types of capital projects and developments, from conception to commissioning and maintenance, in all sectors of the economy, for the attainment of sustainable National development.",
  },
  {
    icon: 'target',
    label: 'Our Mission',
    title: 'Advancing the Profession',
    body: 'Contributing to sustainable development of Nigeria by promoting the patronage of our world-class construction cost services and procurement management experts that meet client needs and expectations through the development of unique and distinctive competencies of the profession.',
  },
  {
    icon: 'advocacy',
    label: 'Our Value',
    title: 'Value for Money',
    body: 'Quantity Surveyors have value for money as their watch word. We are trained to offer comprehensive costing and cost management services.',
  },
];

