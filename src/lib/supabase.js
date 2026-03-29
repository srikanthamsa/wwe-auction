import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

export const ROSTER = [
  ["Afa",86],["AJ Styles",85],["AJ Styles (Demastered)",85],["AJ Styles (Retro)",90],["Akam",80],["Aleister Black",82],["Alex Shelley",80],["Andre The Giant",88],
  ["Batista",89],["Big E",85],["Billy Gunn",83],["Booker T",85],["Booker T '01",85],["Braun Strowman",81],["Bray Wyatt",90],["Bray Wyatt '20",88],["Bray Wyatt '20 (nWo)",87],["Bret Hart",93],["British Bulldog",85],["Brock Lesnar",94],["Bron Breakker",87],["Bronson Reed",85],["Bruno Sammartino",91],["Bubba Ray Dudley",85],
  ["Cactus Jack",82],["Carmelo Hayes",81],["Chad Gable",80],["Chosen",84],["Chris Sabin",80],["CM Punk",92],["CM Punk '10",90],["CM Punk '10 (Masked)",90],["CM Punk '11",93],["CM Punk (S.E.S.)",90],["Cody Rhod35-BOT",96],["Cody Rhodes",96],["Cody Rhodes '22",90],["Cody Rhodes (WM41)",96],["Cody Rhodes Undashing",85],
  ["D-Von Dudley",84],["D'Lo Brown",83],["Damian Priest",86],["DDP",85],["DDP '98",88],["Diesel",87],["Dominik Mysterio",84],["Dominik Mysterio '23 Masked",83],["Drew McIntyre",91],["Drew McIntyre '10",85],["Dude Love",81],["Dusty Rhodes",91],
  ["Eddie Guerrero",90],["El Grande Americano",85],["Elite Bray Wyatt",90],["Elite Cody Rhodes",91],["Elite Hulk Hogan",94],["Elite Jey Uso",90],["Elite Jimmy Uso",84],["Elite John Cena",94],["Elite Roman Reigns '13",87],["Elite Seth Rollins",93],["Elite The Rock",86],["Elite Undertaker",96],["Erick Rowan",80],["Ethan Page",80],
  ["Faarooq",85],["Finn Bálor",87],["Finn Bálor Demon",90],
  ["Goldberg",90],["Gunther",92],
  ["Harley Race",84],["Headshrinker Fatu",82],["Headshrinker Samu",82],["Hollywood Hogan",92],["Honky Tonk Man",81],["Hulk Hogan",92],["Hulk Hogan '02",89],
  ["Ichiban Hulk Hogan",94],["Ilja Dragunov",80],["Ivar",81],
  ["Jacob Fatu",87],["Jake \"The Snake\" Roberts",85],["Jalen Brunson",85],["Jamal",82],["JBL",89],["Jean-Paul Levesque",87],["Jesse Ventura",85],["Jey Uso",90],["Jey Uso '17",85],["Jey Uso (WM41)",90],["Jimmy Uso",84],["Jimmy Uso '17",86],["John Cena",94],["John Cena '07",93],["John Cena '10",95],["John Cena '12",96],["John Cena '20 (nWo)",94],["John Cena '25",95],["John Cena (WM41)",95],["Junkyard Dog",84],
  ["Kane '03",88],["Kane '08",85],["Karrion Kross",81],["Ken Shamrock",86],["Kevin Nash",88],["Kevin Owens",87],["King Booker",89],["King Corbin",81],["Kofi Kingston",81],["Kofi Kingston '17",85],["Kurt Angle",89],["Kurt Angle '00",88],["Kurt Angle (Demastered)",89],
  ["LA Knight",88],["Lex Luger",87],["Logan Paul",90],
  ["Macho Man Randy Savage",89],["Manifestation",90],["Mankind",86],["Mark Henry",90],["Mick Foley (Manager)",83],["Mr. Perfect",84],["Mr. Wonderful Paul Orndorff",86],
  ["New Jack",86],["Nick Aldis",80],
  ["Oba Femi",80],
  ["Paragon Jay Pierce",86],["Pat McAfee",80],["Penta",84],["Penta (WM41)",84],["Peter Maivia",87],
  ["R-Truth Ron Cena",83],["Randy Orton",92],["Randy Orton '09",93],["Randy Orton '15",90],["Ravishing Rick Rude",84],["Razor Ramon",87],["Rey Mysterio",86],["Rezar",80],["Rick Steiner",83],["Ricky Steamboat",88],["Rikishi",81],["Road Dogg",85],["Rob Van Dam",90],["Rob Van Dam '97",90],["Roman Reigns",96],["Roman Reigns '19",92],["Roman Reigns '22",97],["Roman Reigns '22 (Brawl)",97],["Roman Reigns '24",97],["Roman Reigns '25",96],["Roman Reigns (Demastered)",96],["Rosey",80],["Rowdy Roddy Piper",84],
  ["Sami Zayn",86],["Sandman",86],["Scott Hall",87],["Scott Steiner '03",85],["Scott Steiner '93",83],["Seth \"Freakin\" Rollins",93],["Seth Rollins '15",89],["Seth Rollins '22",92],["Shaquille O'Neal",91],["Shawn Michaels",87],["Shawn Michaels '05",94],["Shawn Michaels '94",85],["Sheamus",86],["Shinsuke Nakamura",87],["Sid Justice",89],["Sika",86],["Solo Sikoa",88],["Solo Sikoa (Bloodline Suit)",86],["Solo Sikoa (Tribal Chief)",86],["Stone Cold Steve Austin",97],["Stone Cold Steve Austin '00",95],["Super Cena",100],["Superstar Billy Graham",92],
  ["Tama Tonga",83],["Terry Funk",87],["The Fiend Bray Wyatt",92],["The Fiend Bray Wyatt '23",94],["The Great Khali",86],["The Great Muta",86],["The Iron Sheik",85],["The Miz",81],["The Miz (A-Lister)",81],["The Rock",95],["The Rock '01",96],["The Rock '24",95],["The Rock '97 (NOD)",80],["Theodore Long",85],["Tito Santana",87],["Triple H",91],["Triple H '08",91],["Triple H '14",91],["Triple H '99",89],["Tyrese Haliburton",87],
  ["Ultimate Warrior",92],["Ultimate Warrior (No Paint)",92],["Umaga",86],["Uncle Howdy",87],["Undertaker",96],["Undertaker '03",92],["Undertaker '20",91],["Undertaker '90",88],["Undertaker '98",93],
  ["Vader",87],
  ["Wade Barrett",85],
  ["Xavier Woods",80],["Xavier Woods '17",83],["Xavier Woods (Demastered)",80],
  ["Yokozuna",87]
].filter(([, r]) => r >= 80)

export const PLAYERS = ["Srikant", "Ashpak", "KVD", "Ekansh", "Debu"]
export const STARTING_PURSE = 50000
export const BID_INCREMENT = 500
// no timer — Srikant manually advances rounds

export function getBaseBid(ovr) {
  if (ovr >= 90) return 3000
  if (ovr >= 85) return 2000
  return 1000
}

export function getTier(ovr) {
  if (ovr >= 90) return { label: 'S', color: '#c8a84b' }
  if (ovr >= 85) return { label: 'A', color: '#a0a0a0' }
  return { label: 'B', color: '#cd7f32' }
}

export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
