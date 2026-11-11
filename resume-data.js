/*
 * RESUME DATA — the only file you need to edit.
 * Everything in the game (buildings, skill gems, plain resume view) is
 * generated from this object. Replace every [bracketed] placeholder.
 */
window.RESUME = {
  name: "Aditya D",
  title: "[Your title — e.g. Software Developer]",
  location: "[City, Country]",
  tagline: "[One line about what you build and why]",

  about: [
    "[A short paragraph about who you are, what you work on, and what you are looking for.]",
    "[A second paragraph: strengths, interests, or what makes you different.]"
  ],

  // Shown as RPG-style stats in the HOME building.
  stats: [
    { label: "CLASS", value: "[e.g. Full-Stack Dev]" },
    { label: "EXP", value: "[e.g. 2 yrs]" },
    { label: "BASE", value: "[e.g. India]" }
  ],

  experience: [
    {
      role: "[Job title]",
      company: "[Company]",
      period: "[Mon YYYY – Present]",
      points: [
        "[What you built or owned, with a number if you have one]",
        "[A second achievement]"
      ]
    },
    {
      role: "[Previous job title / internship]",
      company: "[Company]",
      period: "[Mon YYYY – Mon YYYY]",
      points: ["[What you did there]"]
    }
  ],

  projects: [
    {
      name: "[Project name]",
      tech: ["[Tech]", "[Tech]"],
      desc: "[What it does and what you learned or achieved]",
      link: ""
    },
    {
      name: "[Second project]",
      tech: ["[Tech]"],
      desc: "[What it does]",
      link: ""
    }
  ],

  // Every skill also appears in the world as a collectible gem.
  skills: [
    { group: "Languages", items: ["[Skill 1]", "[Skill 2]", "[Skill 3]"] },
    { group: "Frameworks", items: ["[Skill 4]", "[Skill 5]"] },
    { group: "Tools", items: ["[Skill 6]", "[Skill 7]"] }
  ],

  education: [
    {
      degree: "[Degree, branch]",
      school: "[College / University]",
      period: "[YYYY – YYYY]",
      note: "[CGPA, honours, or relevant coursework]"
    }
  ],

  // Leave a value empty ("") to hide that row.
  contact: {
    email: "",
    github: "https://github.com/iAdityaD",
    linkedin: "",
    website: "",
    phone: ""
  }
};
