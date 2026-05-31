export type RoleCategory = "pronoun" | "gender" | "sexuality";

export const ROLE_DEFINITIONS: Record<RoleCategory, string[]> = {
  pronoun: [
    "He/Him",
    "She/Her",
    "They/Them",
    "It/Its",
    "He/They",
    "She/They",
    "Any/All",
    "Ask Pronouns",
  ],
  gender: [
    "Male",
    "Female",
    "Non-Binary",
    "Genderfluid",
    "Agender",
    "Bigender",
    "Demigender",
    "Trans-masc",
    "Trans-fem",
    "Genderqueer",
  ],
  sexuality: [
    "Gay",
    "Lesbian",
    "Bisexual",
    "Pansexual",
    "Asexual",
    "Demisexual",
    "Queer",
    "Questioning",
    "Straight Ally",
    "Aromantic",
    "Omnisexual",
    "Polysexual",
  ],
};

/** All role names flattened, lowercased -> { name, category } */
export const ROLE_LOOKUP = new Map<
  string,
  { name: string; category: RoleCategory }
>();
for (const [category, names] of Object.entries(ROLE_DEFINITIONS)) {
  for (const name of names) {
    ROLE_LOOKUP.set(name.toLowerCase(), {
      name,
      category: category as RoleCategory,
    });
  }
}
