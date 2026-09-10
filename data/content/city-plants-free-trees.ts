export const CITY_PLANTS_SLUG = "city-plants-free-trees";
export const CITY_PLANTS_RESEARCHED_AT = "2026-09-10";
export const CITY_PLANTS_VERIFIED_AT = "2026-09-10T00:00:00.000Z";

export const cityPlantsStructuredPatch = {
  administrator: "City Plants",
  last_verified_at: CITY_PLANTS_VERIFIED_AT,
  benefit_type: "FREE_PRODUCT" as const,
  benefit_min: null,
  benefit_max: null,
  status: "ACTIVE" as const,
  active: true,
};

export const cityPlantsBrief = {
  seo_provider: "manual",
  primary_keyword: "free trees Los Angeles",
  secondary_keywords: [
    "City Plants free trees",
    "LADWP free trees",
    "free trees Los Angeles residents",
    "free shade trees Los Angeles",
    "free trees from LADWP",
    "City Plants eligibility",
    "City Plants tree program",
    "Los Angeles free tree program",
    "free street trees Los Angeles",
    "free yard trees Los Angeles",
    "free parkway trees Los Angeles",
    "City Plants tree delivery",
  ],
  search_intent:
    "Transactional + informational. Searchers want to know whether the trees are truly free, whether they qualify, what type of trees they can get, and how to request them.",
  questions_to_answer: [
    "Does Los Angeles really give residents free trees?",
    "Who qualifies for City Plants?",
    "How many free trees can I get?",
    "Do I need to be an LADWP customer?",
    "Can renters get City Plants trees?",
    "Can I get a free tree for my parkway?",
    "Will City Plants plant the tree for me?",
    "Can I choose the tree type?",
    "Can I get a fruit tree?",
    "What documents do I need?",
    "Can apartment buildings get trees?",
    "Are requests currently open?",
    "Does an LA mailing address mean I qualify?",
    "Where do I apply?",
  ],
  topics_to_cover: [
    "City of Los Angeles residency",
    "yard trees",
    "street trees",
    "tree delivery",
    "up to seven trees",
    "renters",
    "owner/landlord permission where applicable",
    "parkway permits",
    "tree selection",
    "water-efficient shade trees",
    "fruit trees",
    "adoption events",
    "proof of residency",
    "Apartment/HOA pause",
    "City of Los Angeles vs Los Angeles County",
    "LADWP partnership",
  ],
  suggested_title:
    "Free Trees in Los Angeles: City Plants Eligibility & How to Apply (2026)",
  suggested_meta_description:
    "Los Angeles residents may qualify for up to seven free yard trees through City Plants. See eligibility, tree options, renter rules and how to apply.",
  competitor_notes:
    'Prioritize direct-answer coverage for "free trees Los Angeles," "LADWP free trees," renter eligibility, quantity limits, street vs yard trees, and whether City Plants performs planting. Avoid generic landscaping content.',
  research_notes:
    "Primary facts verified from City Plants and LADWP official sources in September 2026. Apartment/HOA pathway is paused, but general City Plants services remain active.",
  researched_at: CITY_PLANTS_RESEARCHED_AT,
};

export const cityPlantsContent = {
  seo_title:
    "Free Trees in Los Angeles: City Plants Eligibility & How to Apply (2026)",
  meta_description:
    "Los Angeles residents may qualify for up to seven free yard trees through City Plants. See eligibility, tree options, renter rules and how to apply.",
  overview:
    "City Plants provides free trees to eligible City of Los Angeles residents through several programs, including yard trees, street trees, and community adoption events. Eligibility is based on being in the City of Los Angeles, not simply living in Los Angeles County. A mailing address that says “Los Angeles” is not enough on its own.",
  benefit_explanation:
    "Eligible residents may receive up to seven free yard trees. Normal residential delivery focuses on water-efficient shade trees, which City Plants delivers for you to plant, along with starter supplies such as stakes, ties, and fertilizer pellets. Street-tree requests follow a different process: City Plants handles permitting and planting in the parkway. This is a free-product benefit, not a cash or rebate amount.",
  how_to_apply:
    "Start through City Plants. Confirm the property is in the City of Los Angeles—City Plants says an address lookup that returns a council district number means the property is in the city. Choose the relevant pathway: yard-tree delivery, street or parkway tree, or an adoption event. Provide the address, contact, and property information that pathway asks for, then follow its specific instructions.",
  documents_needed:
    "Requirements vary by pathway. Adoption events may ask for proof of residency, such as a photo ID or an LADWP bill. Landlord, owner, or property-manager information or permission may be needed for some renter, apartment, HOA, or street-tree situations.",
  important_notes:
    "Program availability varies by tree type and request pathway. Apartment/HOA requests are currently paused, while other City Plants programs and adoption events remain available. An LA mailing address alone does not establish City of Los Angeles eligibility. Fruit trees are not generally part of normal shade-tree delivery and may only be offered at selected events. Adoption-event quantity limits can vary by event, so check the listing for that date. Do not assume renters are eligible in every pathway without owner or landlord conditions.",
};

export const cityPlantsFaqs = [
  {
    sort_order: 10,
    question: "Are City Plants trees really free?",
    answer:
      "Yes. City Plants provides trees at no charge through its published programs. Yard trees are supplied and delivered at no cost, and street-tree permitting and planting are handled by City Plants.",
  },
  {
    sort_order: 20,
    question: "How many free trees can I get?",
    answer:
      "Through the residential yard-tree pathway, Angelenos may receive a total of seven free yard trees to plant on private property, across yard-tree delivery or tree-adoption programs. Street-tree counts are determined separately by a City Plants inspector using City of Los Angeles tree-spacing guidelines. Adoption events can also set their own per-event limits, so check the specific event listing.",
  },
  {
    sort_order: 30,
    question: "Do I have to live in the City of Los Angeles?",
    answer:
      "Yes. City Plants provides trees to residents living within the City of Los Angeles. A postal address that says “Los Angeles” can still be in unincorporated Los Angeles County. City Plants says an address lookup that returns a council district number means the property is in the city.",
  },
  {
    sort_order: 40,
    question: "Can renters get free trees from City Plants?",
    answer:
      "Renters are not automatically excluded, but requirements vary by pathway. Official materials say people who live or own property in the City of Los Angeles may be eligible. For street trees, City Plants asks whether you are a homeowner or renter and recommends notifying the landlord or property owner; landlord contact information may be required. Apartment and HOA requests currently require owner, property-manager, or HOA-board permission and that pathway is paused.",
  },
  {
    sort_order: 50,
    question: "Do I have to be an LADWP customer?",
    answer:
      "Published City Plants eligibility is framed around being in the City of Los Angeles, not around proving LADWP account status. LADWP is a funding partner and has supported City Plants tree planting since 1998. An LADWP bill can be used as proof of residency at some adoption events, but that is not the same as a universal utility-customer requirement.",
  },
  {
    sort_order: 60,
    question: "Will City Plants plant the tree for me?",
    answer:
      "It depends on the pathway. Yard trees are delivered for you to plant. Street and parkway trees are planted by City Plants, which also handles the city permit process. You are expected to water and care for the tree after planting or delivery.",
  },
  {
    sort_order: 70,
    question: "Can I get a free street or parkway tree?",
    answer:
      "Yes, through City Plants’ street-tree pathway. City Plants takes care of permitting and planting in the parkway—the strip between the sidewalk and the street. The inspector chooses the species based on surrounding infrastructure and city spacing guidelines, and some ZIP codes are currently listed as ineligible for that street-tree form. Renters should notify the property owner before applying.",
  },
  {
    sort_order: 80,
    question: "Can I choose what type of tree I receive?",
    answer:
      "For yard trees, City Plants says you can choose from more than 30 water-efficient shade-tree species. For street and parkway trees, an inspector ultimately chooses the species. Recommendations are welcome, but City Plants cannot guarantee a preferred street-tree species.",
  },
  {
    sort_order: 90,
    question: "Can I get a fruit tree?",
    answer:
      "City Plants only delivers shade trees through normal residential delivery. Fruit trees may be given away at some adoption events, typically in cooler months. Check the City Plants calendar for fruit-tree adoption listings rather than assuming fruit trees are part of every request.",
  },
  {
    sort_order: 100,
    question: "What proof or documents might I need?",
    answer:
      "It depends on the pathway. Adoption events may require proof of City of Los Angeles residency, such as a photo ID or an LADWP bill. Street-tree and apartment/HOA pathways may ask for landlord, owner, or property-manager contact information or permission. Follow the instructions on the specific City Plants form or event listing.",
  },
  {
    sort_order: 110,
    question: "Are City Plants requests currently open?",
    answer:
      "The general City Plants program remains active: yard-tree delivery, street-tree requests, and September 2026 adoption events are still being offered. The Apartment/HOA request pathway is currently paused while City Plants works through pending applications. Check City Plants for the latest status of that pathway.",
  },
];

export const cityPlantsEvidence = [
  {
    content_section: "eligibility",
    claim:
      "People who live or own property in the City of Los Angeles are eligible to receive free trees from City Plants.",
    source_url: "https://www.cityplants.org/our-programs/",
    source_title: "Our Programs",
    source_publisher: "City Plants",
    notes: "Official eligibility is framed as City of LA residency or property, not county-wide.",
  },
  {
    content_section: "benefit",
    claim:
      "Eligible residents may receive up to seven free, water-efficient shade trees for yard planting.",
    source_url: "https://www.cityplants.org/our-programs/",
    source_title: "Our Programs",
    source_publisher: "City Plants",
    notes: "Quantity is a tree count, not a dollar benefit.",
  },
  {
    content_section: "benefit",
    claim:
      "City Plants trees are provided at no charge through published yard-tree, street-tree, and related programs.",
    source_url: "https://www.cityplants.org/",
    source_title: "City Plants home page",
    source_publisher: "City Plants",
    notes: null,
  },
  {
    content_section: "benefit",
    claim:
      "Yard trees are delivered to the door with starter supplies such as stakes, ties, and fertilizer pellets.",
    source_url: "https://www.cityplants.org/our-programs/",
    source_title: "Our Programs",
    source_publisher: "City Plants",
    notes: null,
  },
  {
    content_section: "application",
    claim:
      "Yard trees are delivered for the resident to plant; City Plants does not plant those trees for the recipient.",
    source_url: "https://www.cityplants.org/",
    source_title: "City Plants home page",
    source_publisher: "City Plants",
    notes: 'Home page copy: “We deliver straight to your door – you plant!”',
  },
  {
    content_section: "application",
    claim:
      "For street trees, City Plants handles City permitting and planting; the recipient waters the trees.",
    source_url: "https://www.cityplants.org/our-programs/",
    source_title: "Our Programs",
    source_publisher: "City Plants",
    notes: null,
  },
  {
    content_section: "eligibility",
    claim:
      "The City Plants street-tree application currently lists specific ZIP codes and states that if a ZIP code is not listed, the area is not eligible for the free street-trees program.",
    source_url: "https://www.cityplants.org/street-trees-for-your-home-application/",
    source_title: "Street Trees for Your Home Application",
    source_publisher: "City Plants",
    notes:
      "Official form copy: “If your zip code is not listed above, your area is currently not eligible for our free street trees program.” This restriction is time-sensitive and applies to the street-tree pathway, not all City Plants programs.",
  },
  {
    content_section: "eligibility",
    claim:
      "A postal address that says “Los Angeles” is not enough, because the property may be in unincorporated Los Angeles County rather than the City of Los Angeles.",
    source_url: "https://www.cityplants.org/faq/",
    source_title: "Frequently Asked Questions",
    source_publisher: "City Plants",
    notes: "City Plants is only able to provide trees to residents living within the City of Los Angeles.",
  },
  {
    content_section: "eligibility",
    claim:
      "Homeownership is not a universal requirement; published eligibility includes people who live or own property in the City of Los Angeles, and street-tree applications allow renters.",
    source_url: "https://www.cityplants.org/our-programs/",
    source_title: "Our Programs",
    source_publisher: "City Plants",
    notes: "Street-tree form also asks whether the applicant is a homeowner or renter.",
  },
  {
    content_section: "eligibility",
    claim:
      "Published City Plants eligibility pages do not state a general household-income requirement.",
    source_url: "https://www.cityplants.org/our-programs/",
    source_title: "Our Programs",
    source_publisher: "City Plants",
    notes:
      "Eligibility is described in terms of City of Los Angeles location/property. No income screen appears in the published program overview.",
  },
  {
    content_section: "faq",
    claim:
      "City Plants gives away fruit trees at some adoption events and only delivers shade trees through normal residential delivery.",
    source_url: "https://www.cityplants.org/faq/",
    source_title: "Frequently Asked Questions",
    source_publisher: "City Plants",
    notes: "FAQ: fruit trees at adoption events sporadically; City Plants only delivers shade trees.",
  },
  {
    content_section: "important_notes",
    claim:
      "New Apartment/HOA tree requests are currently paused while City Plants processes pending applications.",
    source_url: "https://www.cityplants.org/trees-for-your-apartment-or-hoa/",
    source_title: "Trees for Your Apartment or HOA",
    source_publisher: "City Plants",
    notes: "Pause notice is on the Apartment/HOA request page, not on yard-tree or street-tree pages.",
  },
  {
    content_section: "important_notes",
    claim:
      "City Plants adoption events remain scheduled in September 2026, including shade-tree and fruit-and-shade-tree giveaways.",
    source_url: "https://www.cityplants.org/calendar/",
    source_title: "Calendar",
    source_publisher: "City Plants",
    notes: "September 2026 listings include Boyle Heights, Crenshaw, North Hills, and Watts events.",
  },
  {
    content_section: "faq",
    claim:
      "LADWP funds City Plants tree planting and states that City of LA residents are eligible for free trees for yards or parkways; it does not publish a standalone LADWP-customer-only screen on that page.",
    source_url:
      "https://www.ladwp.com/commercial-services/programs-and-rebates-commercial/city-plants",
    source_title: "City Plants",
    source_publisher: "Los Angeles Department of Water and Power",
    notes: "Used to support the funding-partner FAQ, not a universal utility-customer rule.",
  },
  {
    content_section: "application",
    claim:
      "Adoption events may require proof of City of Los Angeles residency, such as a photo ID or an LADWP bill.",
    source_url: "https://www.cityplants.org/tree-adoptions/",
    source_title: "Tree Adoptions",
    source_publisher: "City Plants",
    notes: "Event rules also appear on individual calendar listings.",
  },
];
