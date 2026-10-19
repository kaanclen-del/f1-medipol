/**
 * Historical radio sessions from 2023 onwards. These are session references,
 * not claims that any particular famous quote appears in a clip.
 * Audio is retrieved on demand; we do not store or redistribute media files.
 */
export type TeamRadioPreset = {
  id: string;
  year: number;
  grandPrix: string;
  countryName: string;
  sessionName: "Race";
  driver: string;
  driverNumber: number;
  abbreviation: string;
  team: string;
  accent: string;
  shortLabel: string;
};

export const TEAM_RADIO_PRESETS: TeamRadioPreset[] = [
  {
    id: "sainz-singapore-2023",
    year: 2023,
    grandPrix: "Singapur Grand Prix",
    countryName: "Singapore",
    sessionName: "Race",
    driver: "Carlos Sainz",
    driverNumber: 55,
    abbreviation: "SAI",
    team: "Ferrari",
    accent: "#ff5b60",
    shortLabel: "SİNGAPUR 2023",
  },
  {
    id: "leclerc-monaco-2024",
    year: 2024,
    grandPrix: "Monako Grand Prix",
    countryName: "Monaco",
    sessionName: "Race",
    driver: "Charles Leclerc",
    driverNumber: 16,
    abbreviation: "LEC",
    team: "Ferrari",
    accent: "#fc7259",
    shortLabel: "MONAKO 2024",
  },
  {
    id: "hamilton-silverstone-2024",
    year: 2024,
    grandPrix: "Britanya Grand Prix",
    countryName: "Great Britain",
    sessionName: "Race",
    driver: "Lewis Hamilton",
    driverNumber: 44,
    abbreviation: "HAM",
    team: "Mercedes",
    accent: "#59e1c6",
    shortLabel: "SILVERSTONE 2024",
  },
  {
    id: "verstappen-brazil-2024",
    year: 2024,
    grandPrix: "São Paulo Grand Prix",
    countryName: "Brazil",
    sessionName: "Race",
    driver: "Max Verstappen",
    driverNumber: 1,
    abbreviation: "VER",
    team: "Red Bull Racing",
    accent: "#74a5ff",
    shortLabel: "BREZİLYA 2024",
  },
];
