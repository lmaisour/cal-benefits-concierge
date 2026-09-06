export const programCategories = [
  { slug: "vehicles", label: "Vehicles", description: "EV rebates and vehicle retirement" },
  { slug: "home-energy", label: "Home & Energy", description: "Upgrades, solar, and weatherization" },
  { slug: "utilities", label: "Utilities", description: "Bill discounts and energy assistance" },
  { slug: "housing", label: "Housing", description: "Homebuyer and housing help" },
  { slug: "water", label: "Water", description: "Rebates for water and landscaping" },
  { slug: "family", label: "Family", description: "Household and family benefits" },
  { slug: "food", label: "Food", description: "Food benefits and nutrition programs" },
  { slug: "communications", label: "Communications", description: "Phone and broadband assistance" },
  { slug: "taxes", label: "Taxes", description: "Credits and tax-related programs" },
  { slug: "other", label: "Other assistance", description: "Additional California programs" },
] as const;

export type ProgramCategorySlug = (typeof programCategories)[number]["slug"];
