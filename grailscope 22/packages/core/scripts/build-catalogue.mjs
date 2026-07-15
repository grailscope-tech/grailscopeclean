// Generates packages/core/src/catalogue.json from a compact, curated list of
// real-world collectibles. Run: node scripts/build-catalogue.mjs
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const AV = {
  ON: "Sur le marché", AUC: "Enchères à venir", OFF: "Hors marché",
  PRIV: "Collection privée", MUS: "Musée", NEV: "Jamais en vente",
};
const tradable = (a) => a === "ON" || a === "AUC";

// Compact rows: { n:name, c:category, i:icon, m:meta, p:price€, g:30d%, a:availability,
//   fv?:fairValue, vol?, liq?, hold?, prov?, ls?:[year,price,venue] }
const ROWS = [
  // ===================== ART =====================
  { n: "Mona Lisa — Léonard de Vinci", c: "Art", i: "🖼️", m: "Huile sur peuplier · 1503", p: 860000000, g: 0.3, a: "NEV", prov: "Musée du Louvre, Paris" },
  { n: "Salvator Mundi — da Vinci", c: "Art", i: "🖼️", m: "Huile sur noyer · ~1500", p: 400000000, g: -0.4, a: "PRIV", prov: "Acquéreur saoudien (présumé)", ls: [2017, 382000000, "Christie's New York"] },
  { n: "Interchange — de Kooning", c: "Art", i: "🖼️", m: "Huile sur toile · 1955", p: 270000000, g: 0.6, a: "PRIV", prov: "Kenneth C. Griffin", ls: [2015, 270000000, "Vente privée"] },
  { n: "The Card Players — Cézanne", c: "Art", i: "🃏", m: "Huile sur toile · 1892", p: 230000000, g: 0.2, a: "PRIV", prov: "Famille royale du Qatar", ls: [2011, 230000000, "Vente privée"] },
  { n: "Nafea Faa Ipoipo — Gauguin", c: "Art", i: "🖼️", m: "Huile sur toile · 1892", p: 190000000, g: 0.4, a: "PRIV", ls: [2015, 190000000, "Vente privée"] },
  { n: "Number 17A — Pollock", c: "Art", i: "🖼️", m: "Huile sur fibre · 1948", p: 180000000, g: 0.5, a: "PRIV", prov: "Kenneth C. Griffin", ls: [2015, 180000000, "Vente privée"] },
  { n: "Les Femmes d'Alger (O) — Picasso", c: "Art", i: "🖼️", m: "Huile sur toile · 1955", p: 165000000, g: 1.1, a: "PRIV", ls: [2015, 160000000, "Christie's New York"] },
  { n: "Wasserschlangen II — Klimt", c: "Art", i: "🐍", m: "Huile sur toile · 1907", p: 170000000, g: 0.3, a: "PRIV", ls: [2013, 170000000, "Vente privée"] },
  { n: "Shot Sage Blue Marilyn — Warhol", c: "Art", i: "💋", m: "Sérigraphie · 1964", p: 175000000, g: 0.8, a: "PRIV", ls: [2022, 175000000, "Christie's New York"] },
  { n: "Rabbit — Jeff Koons", c: "Art", i: "🐰", m: "Acier inox · 1986", p: 85000000, g: 0.6, a: "PRIV", ls: [2019, 85000000, "Christie's New York"] },
  { n: "Three Studies of Lucian Freud — Bacon", c: "Art", i: "🖼️", m: "Triptyque · 1969", p: 130000000, g: 0.4, a: "PRIV", ls: [2013, 130000000, "Christie's New York"] },
  { n: "L'Homme au doigt — Giacometti", c: "Art", i: "🗿", m: "Bronze · 1947", p: 130000000, g: 0.5, a: "PRIV", ls: [2015, 126000000, "Christie's New York"] },
  { n: "Untitled (crâne) — Basquiat", c: "Art", i: "💀", m: "Acrylique · 1982", p: 102000000, g: 2.4, a: "PRIV", prov: "Yusaku Maezawa", ls: [2017, 100000000, "Sotheby's New York"] },
  { n: "La Nuit étoilée — van Gogh", c: "Art", i: "🌌", m: "Huile sur toile · 1889", p: 280000000, g: 0.2, a: "MUS", prov: "MoMA, New York" },
  { n: "Guernica — Picasso", c: "Art", i: "🕊️", m: "Huile sur toile · 1937", p: 250000000, g: 0.1, a: "NEV", prov: "Museo Reina Sofía, Madrid" },
  { n: "Le Cri — Munch (version pastel)", c: "Art", i: "😱", m: "Pastel · 1895", p: 110000000, g: 0.7, a: "PRIV", ls: [2012, 107000000, "Sotheby's New York"] },
  { n: "Warhol — Flowers (1970)", c: "Art", i: "🌺", m: "Sérigraphie · F&S II.71", p: 520000, g: -1.8, a: "ON", liq: "Moyenne", hold: "6,3 ans" },
  { n: "Banksy — Girl with Balloon", c: "Art", i: "🎈", m: "Print signé · POW", p: 285000, g: 9.8, a: "ON", liq: "Moyenne", hold: "5,6 ans" },
  { n: "KAWS Companion (2016)", c: "Art", i: "🧸", m: "Figurine · open ed.", p: 1850, g: -11.2, a: "ON", liq: "Élevée", hold: "0,9 an" },
  { n: "Hockney — Pool prints", c: "Art", i: "🏊", m: "Lithographie signée", p: 42000, g: 3.1, a: "ON", liq: "Moyenne", hold: "4,0 ans" },
  { n: "Damien Hirst — Spot print", c: "Art", i: "🔵", m: "Sérigraphie · signée", p: 12000, g: -4.5, a: "ON", liq: "Élevée", hold: "2,5 ans" },
  { n: "Yayoi Kusama — Pumpkin (print)", c: "Art", i: "🎃", m: "Sérigraphie · éd. limitée", p: 28000, g: 6.2, a: "ON", liq: "Moyenne", hold: "3,4 ans" },
  { n: "Takashi Murakami — Flower print", c: "Art", i: "🌼", m: "Offset signé", p: 3500, g: -2.0, a: "ON", liq: "Élevée", hold: "1,6 an" },
  { n: "Picasso — Madoura ceramic", c: "Art", i: "🏺", m: "Édition · cachet", p: 26000, g: 1.4, a: "ON", liq: "Faible", hold: "7,0 ans" },
  { n: "Soulages — Outrenoir (petit format)", c: "Art", i: "⬛", m: "Huile · années 2000", p: 480000, g: 2.2, a: "OFF", prov: "Collection privée européenne" },
  { n: "Monet — Nymphéas (étude)", c: "Art", i: "🪷", m: "Huile · ~1915", p: 48000000, g: 0.6, a: "PRIV" },
  { n: "Vermeer — Jeune fille à la perle", c: "Art", i: "💧", m: "Huile · ~1665", p: 220000000, g: 0.1, a: "MUS", prov: "Mauritshuis, La Haye" },
  { n: "Hokusai — La Grande Vague (estampe)", c: "Art", i: "🌊", m: "Estampe · ~1831", p: 2800000, g: 4.0, a: "AUC" },

  // ===================== LUXE =====================
  { n: "Patek Philippe Grandmaster Chime 6300A", c: "Luxe", i: "⌚", m: "Acier · pièce unique", p: 28000000, g: 0.5, a: "PRIV", ls: [2019, 28500000, "Only Watch / Christie's"] },
  { n: "Rolex Daytona de Paul Newman (sa montre)", c: "Luxe", i: "⌚", m: "Réf. 6239 · originale", p: 16000000, g: 0.8, a: "PRIV", ls: [2017, 15900000, "Phillips New York"] },
  { n: "Rolex « Bao Dai » 6062", c: "Luxe", i: "⌚", m: "Or · cadran noir diamants", p: 4900000, g: 0.6, a: "PRIV", ls: [2017, 4900000, "Phillips Genève"] },
  { n: "Patek Philippe 1518 en acier", c: "Luxe", i: "⌚", m: "Chrono quantième perpétuel", p: 10000000, g: 0.7, a: "PRIV", ls: [2016, 11000000, "Phillips Genève"] },
  { n: "Patek Philippe 2499 (1ère série)", c: "Luxe", i: "⌚", m: "Or jaune · ~1951", p: 3800000, g: 1.0, a: "AUC" },
  { n: "Diamant Hope", c: "Luxe", i: "💎", m: "45,52 ct · bleu", p: 230000000, g: 0.1, a: "MUS", prov: "Smithsonian, Washington" },
  { n: "Pink Star (diamant)", c: "Luxe", i: "💎", m: "59,60 ct · rose vif", p: 65000000, g: 0.4, a: "PRIV", ls: [2017, 65000000, "Sotheby's Hong Kong"] },
  { n: "Oppenheimer Blue (diamant)", c: "Luxe", i: "💎", m: "14,62 ct · bleu", p: 52000000, g: 0.3, a: "PRIV", ls: [2016, 52000000, "Christie's Genève"] },
  { n: "Collier Breguet « Marie-Antoinette »", c: "Luxe", i: "📿", m: "Reconstitution historique", p: 9000000, g: 0.2, a: "MUS" },
  { n: "Rolex Daytona Paul Newman", c: "Luxe", i: "⌚", m: "Réf. 6239 · acier", p: 248000, g: 8.4, a: "ON", liq: "Élevée", hold: "4,2 ans" },
  { n: "Rolex Daytona 116500LN", c: "Luxe", i: "⌚", m: "Acier · cadran blanc", p: 32000, g: -3.2, a: "ON", liq: "Élevée", hold: "3,0 ans" },
  { n: "Rolex Submariner 16610", c: "Luxe", i: "⌚", m: "Acier · années 1990", p: 12500, g: 2.1, a: "ON", liq: "Élevée", hold: "5,0 ans" },
  { n: "Rolex GMT-Master II « Pepsi » 126710", c: "Luxe", i: "⌚", m: "Acier · acier Jubilé", p: 19500, g: 1.5, a: "ON", liq: "Élevée", hold: "3,5 ans" },
  { n: "Patek Nautilus 5711", c: "Luxe", i: "⌚", m: "Réf. 5711/1A · bleu", p: 132000, g: -6.3, a: "ON", liq: "Élevée", hold: "3,4 ans" },
  { n: "Patek Aquanaut 5167A", c: "Luxe", i: "⌚", m: "Acier · noir", p: 58000, g: -2.8, a: "ON", liq: "Élevée", hold: "3,2 ans" },
  { n: "Audemars Piguet Royal Oak Jumbo", c: "Luxe", i: "⌚", m: "15202ST · bleu", p: 95000, g: -2.1, a: "ON", liq: "Élevée", hold: "3,0 ans" },
  { n: "Omega Speedmaster « Ed White » 105.003", c: "Luxe", i: "⌚", m: "Vintage · ~1965", p: 38000, g: 3.6, a: "ON", liq: "Moyenne", hold: "6,0 ans" },
  { n: "Omega Speedmaster Moonwatch", c: "Luxe", i: "⌚", m: "Acier · Hesalite", p: 7200, g: 1.1, a: "ON", liq: "Élevée", hold: "4,0 ans" },
  { n: "Vacheron Constantin Overseas", c: "Luxe", i: "⌚", m: "Acier · bleu", p: 28000, g: 0.9, a: "ON", liq: "Moyenne", hold: "3,5 ans" },
  { n: "Jaeger-LeCoultre Reverso", c: "Luxe", i: "⌚", m: "Acier · classique", p: 9500, g: 0.4, a: "ON", liq: "Moyenne", hold: "5,0 ans" },
  { n: "Richard Mille RM 011", c: "Luxe", i: "⌚", m: "Felipe Massa · NTPT", p: 195000, g: -1.4, a: "ON", liq: "Moyenne", hold: "2,8 ans" },
  { n: "Richard Mille RM 56-02 Sapphire", c: "Luxe", i: "⌚", m: "Boîtier saphir · ~10 ex.", p: 1800000, g: 3.2, a: "OFF" },
  { n: "Tudor Black Bay 58", c: "Luxe", i: "⌚", m: "Acier · bleu", p: 3600, g: 0.6, a: "ON", liq: "Élevée", hold: "3,0 ans" },
  { n: "Grand Seiko « Snowflake » SBGA211", c: "Luxe", i: "⌚", m: "Titane · Spring Drive", p: 4900, g: 1.0, a: "ON", liq: "Moyenne", hold: "4,0 ans" },
  { n: "Hermès Birkin Himalaya", c: "Luxe", i: "👜", m: "Croco · hardware diamant", p: 315000, g: 5.2, a: "ON", liq: "Moyenne", hold: "5,1 ans" },
  { n: "Hermès Birkin 25 Togo", c: "Luxe", i: "👜", m: "Cuir Togo · GHW", p: 22000, g: 3.8, a: "ON", liq: "Moyenne", hold: "4,0 ans" },
  { n: "Hermès Kelly 28 Sellier", c: "Luxe", i: "👜", m: "Epsom · or", p: 24000, g: 4.2, a: "ON", liq: "Moyenne", hold: "4,5 ans" },
  { n: "Chanel Classic Flap (medium)", c: "Luxe", i: "👜", m: "Caviar · CHW", p: 9500, g: 6.0, a: "ON", liq: "Élevée", hold: "3,0 ans" },
  { n: "Cartier Love bracelet (or)", c: "Luxe", i: "💛", m: "Or jaune 18k", p: 7800, g: 2.0, a: "ON", liq: "Élevée", hold: "5,0 ans" },

  // ===================== SPORT =====================
  { n: "Mickey Mantle 1952 Topps", c: "Sport", i: "⚾", m: "SGC 9.5 · #311", p: 11000000, g: 1.2, a: "PRIV", ls: [2022, 11500000, "Heritage Auctions"] },
  { n: "Maillot Maradona « Main de Dieu » '86", c: "Sport", i: "👕", m: "Porté en match", p: 8400000, g: 0.9, a: "PRIV", ls: [2022, 8400000, "Sotheby's Londres"] },
  { n: "Honus Wagner T206", c: "Sport", i: "🃏", m: "SGC 2 · 1909-11", p: 6500000, g: 1.6, a: "AUC", ls: [2022, 6700000, "Goldin Auctions"] },
  { n: "Pokémon Pikachu Illustrator", c: "Sport", i: "⚡", m: "PSA 7 · promo 1998", p: 5000000, g: 2.4, a: "PRIV", ls: [2022, 5000000, "Vente privée (Logan Paul)"] },
  { n: "LeBron James Rookie Logoman Auto", c: "Sport", i: "🏀", m: "2003-04 UD · 1/1", p: 5000000, g: -3.4, a: "PRIV", ls: [2021, 4800000, "Vente privée"] },
  { n: "Babe Ruth — maillot Yankees ~1920", c: "Sport", i: "👕", m: "Porté · authentifié", p: 5800000, g: 1.1, a: "PRIV", ls: [2019, 5640000, "Hunt Auctions"] },
  { n: "Maillot Jordan Finales NBA 1998", c: "Sport", i: "🏀", m: "« The Last Dance »", p: 9000000, g: 2.0, a: "PRIV", ls: [2022, 9000000, "Sotheby's New York"] },
  { n: "Peignoir de Mohamed Ali — Thrilla in Manila", c: "Sport", i: "🥊", m: "1975 · porté", p: 2500000, g: 2.0, a: "OFF" },
  { n: "Médaille d'or Jesse Owens 1936", c: "Sport", i: "🥇", m: "JO de Berlin", p: 1400000, g: 0.7, a: "PRIV", ls: [2013, 1400000, "SCP Auctions"] },
  { n: "Wayne Gretzky Rookie 1979 O-Pee-Chee", c: "Sport", i: "🏒", m: "PSA 10", p: 3500000, g: 1.4, a: "AUC", ls: [2021, 3500000, "Heritage Auctions"] },
  { n: "Mike Trout Superfractor Rookie", c: "Sport", i: "⚾", m: "2009 Bowman Chrome · 1/1", p: 3600000, g: -1.0, a: "PRIV", ls: [2020, 3600000, "Goldin Auctions"] },
  { n: "Tom Brady Rookie Auto", c: "Sport", i: "🏈", m: "2000 Playoff Contenders", p: 2200000, g: 3.0, a: "OFF", ls: [2021, 2200000, "Lelands"] },
  { n: "Pokémon Dracaufeu 1ère éd.", c: "Sport", i: "🔥", m: "PSA 10 · Base Set", p: 42000, g: 14.7, a: "ON", liq: "Moyenne", hold: "1,8 an" },
  { n: "Michael Jordan Rookie", c: "Sport", i: "🏀", m: "1986 Fleer · PSA 9", p: 21500, g: 6.7, a: "ON", liq: "Moyenne", hold: "3,1 ans" },
  { n: "Pokémon Base Set — booster box scellé", c: "Sport", i: "📦", m: "1999 · WOTC", p: 380000, g: 9.0, a: "ON", liq: "Faible", hold: "4,0 ans" },
  { n: "Panini Prizm Luka Dončić Rookie Silver", c: "Sport", i: "🏀", m: "2018-19 · PSA 10", p: 4500, g: -8.0, a: "ON", liq: "Élevée", hold: "1,2 an" },
  { n: "Topps Chrome Refractor — Pujols RC", c: "Sport", i: "⚾", m: "2001 · PSA 10", p: 7800, g: 2.0, a: "ON", liq: "Moyenne", hold: "3,0 ans" },
  { n: "Yu-Gi-Oh! Blue-Eyes White Dragon (1st)", c: "Sport", i: "🐉", m: "LOB · PSA 9", p: 9000, g: 5.5, a: "ON", liq: "Moyenne", hold: "2,5 ans" },
  { n: "Carte Lionel Messi Rookie (2004 Panini)", c: "Sport", i: "⚽", m: "Mega Cracks · PSA 10", p: 65000, g: 7.0, a: "ON", liq: "Moyenne", hold: "3,0 ans" },
  { n: "Gants signés Mike Tyson", c: "Sport", i: "🥊", m: "Authentifiés", p: 28000, g: 1.5, a: "ON", liq: "Faible", hold: "5,0 ans" },
  { n: "Ballon signé équipe France 1998", c: "Sport", i: "⚽", m: "Coupe du Monde", p: 12000, g: 2.0, a: "OFF" },
  { n: "Magic: The Gathering — Black Lotus (Alpha)", c: "Sport", i: "🌸", m: "Alpha · prix marché live", p: 480000, g: 4.0, a: "ON", liq: "Faible", hold: "5,0 ans" },

  // ===================== CULTURE =====================
  { n: "Guitare Martin D-18E de Kurt Cobain", c: "Culture", i: "🎸", m: "MTV Unplugged · 1959", p: 5800000, g: 1.0, a: "PRIV", ls: [2020, 5400000, "Julien's Auctions"] },
  { n: "Codex Leicester — Léonard de Vinci", c: "Culture", i: "📜", m: "Manuscrit · ~1510", p: 45000000, g: 0.3, a: "PRIV", prov: "Bill Gates", ls: [1994, 28000000, "Christie's New York"] },
  { n: "Bible de Gutenberg", c: "Culture", i: "📕", m: "~1455 · imprimée", p: 35000000, g: 0.1, a: "MUS", prov: "Bibliothèques institutionnelles" },
  { n: "Birds of America — Audubon", c: "Culture", i: "🦅", m: "Double elephant folio", p: 11000000, g: 0.6, a: "PRIV", ls: [2010, 9700000, "Sotheby's Londres"] },
  { n: "Stradivarius « Messie » (1716)", c: "Culture", i: "🎻", m: "Violon · jamais joué", p: 18000000, g: 0.1, a: "MUS", prov: "Ashmolean Museum, Oxford" },
  { n: "Stradivarius « Lady Blunt » (1721)", c: "Culture", i: "🎻", m: "Violon · état exceptionnel", p: 14000000, g: 0.6, a: "PRIV", ls: [2011, 14200000, "Tarisio (online)"] },
  { n: "Premier Folio de Shakespeare (1623)", c: "Culture", i: "📖", m: "Comedies, Histories & Tragedies", p: 9000000, g: 0.8, a: "PRIV", ls: [2020, 9200000, "Christie's New York"] },
  { n: "Action Comics #1 (Superman, 1938)", c: "Culture", i: "🦸", m: "CGC 8.5", p: 3200000, g: 2.7, a: "OFF", ls: [2014, 2950000, "eBay (record)"] },
  { n: "Detective Comics #27 (Batman, 1939)", c: "Culture", i: "🦇", m: "CGC 7.0", p: 1900000, g: 3.2, a: "AUC", ls: [2020, 1500000, "Heritage Auctions"] },
  { n: "Amazing Fantasy #15 (Spider-Man, 1962)", c: "Culture", i: "🕷️", m: "CGC 9.6", p: 3300000, g: 1.8, a: "PRIV", ls: [2021, 3360000, "Heritage Auctions"] },
  { n: "Gibson J-160E de John Lennon", c: "Culture", i: "🎸", m: "1962 · perdue puis retrouvée", p: 2200000, g: 0.5, a: "PRIV", ls: [2015, 2230000, "Julien's Auctions"] },
  { n: "Fender Strat « Woodstock » de Hendrix", c: "Culture", i: "🎸", m: "1968 · jouée à Woodstock", p: 2600000, g: 0.9, a: "PRIV" },
  { n: "Paroles manuscrites « Hotel California »", c: "Culture", i: "📝", m: "Eagles · Don Henley", p: 900000, g: 1.4, a: "AUC" },
  { n: "Paroles « Like a Rolling Stone » — Dylan", c: "Culture", i: "📝", m: "Manuscrit · 1965", p: 1900000, g: 1.0, a: "PRIV", ls: [2014, 1820000, "Sotheby's New York"] },
  { n: "Gant cristal de Michael Jackson", c: "Culture", i: "🧤", m: "Porté en scène", p: 380000, g: 2.0, a: "OFF", ls: [2009, 350000, "Julien's Auctions"] },
  { n: "Souliers rubis du Magicien d'Oz", c: "Culture", i: "👠", m: "1939 · pièce écran", p: 28000000, g: 0.2, a: "MUS", prov: "Smithsonian (une paire)" },
  { n: "Robe « Happy Birthday » de Marilyn Monroe", c: "Culture", i: "👗", m: "1962 · Jean Louis", p: 4800000, g: 0.8, a: "PRIV", ls: [2016, 4800000, "Julien's Auctions"] },
  { n: "Sabre laser original (Star Wars, A New Hope)", c: "Culture", i: "⚔️", m: "Prop écran", p: 450000, g: 3.0, a: "AUC" },
  { n: "Abbey Road 1ère presse", c: "Culture", i: "💿", m: "UK 1969 · vinyle", p: 5400, g: 3.9, a: "ON", liq: "Élevée", hold: "4,8 ans" },
  { n: "Fender Stratocaster 1962", c: "Culture", i: "🎸", m: "Pre-CBS · sunburst", p: 68000, g: 1.1, a: "ON", liq: "Faible", hold: "9,0 ans" },
  { n: "Beatles « Butcher Cover » scellé", c: "Culture", i: "💿", m: "Yesterday and Today · 1966", p: 125000, g: 4.5, a: "ON", liq: "Faible", hold: "6,0 ans" },
  { n: "Harry Potter à l'école des sorciers (1ère éd.)", c: "Culture", i: "📗", m: "1997 · Bloomsbury, hardback", p: 95000, g: 5.0, a: "ON", liq: "Faible", hold: "5,0 ans" },
  { n: "The Great Gatsby (1ère éd., jaquette)", c: "Culture", i: "📘", m: "1925 · Scribner", p: 180000, g: 2.0, a: "ON", liq: "Très faible", hold: "8,0 ans" },
  { n: "Affiche originale Metropolis (1927)", c: "Culture", i: "🎬", m: "Internationale · état A", p: 850000, g: 1.5, a: "OFF" },
  { n: "Gibson Les Paul Standard 1959", c: "Culture", i: "🎸", m: "« Burst » · sunburst", p: 420000, g: 2.4, a: "ON", liq: "Faible", hold: "7,0 ans" },
  { n: "Rolleiflex / Leica M3 collector", c: "Culture", i: "📷", m: "Leica M3 · 1954", p: 6500, g: 1.0, a: "ON", liq: "Moyenne", hold: "4,0 ans" },
];

// ---- defaults & normalisation ----
function slug(s) {
  return s.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 48);
}
const VOLC = { Art: 0.07, Luxe: 0.06, Sport: 0.09, Culture: 0.06 };
const usedIds = new Set();

const out = ROWS.map((r, idx) => {
  const seed = idx + 1;
  const trad = tradable(r.a);
  let id = slug(r.n);
  while (usedIds.has(id)) id = id + "-" + seed;
  usedIds.add(id);

  const volatility = r.vol ?? (trad ? VOLC[r.c] : 0.025);
  const trend = (r.g >= 0 ? 1 : -1) * (0.0008 + Math.abs(r.g) / 100 * 0.02);
  const fairValue =
    r.fv ??
    (trad
      ? Math.round(r.p * (1 - (r.g / 100) * 0.8 + (((seed % 5) - 2) * 0.012)))
      : Math.round(r.p * (1 + (((seed % 7) - 3) * 0.006))));
  const liquidity = r.liq ?? (r.a === "ON" ? "Élevée" : r.a === "AUC" ? "Faible" : "Très faible");
  const avgHold = r.hold ?? (trad ? `${2 + (seed % 8)},0 ans` : "—");

  const o = {
    id, name: r.n, category: r.c, meta: r.m, icon: r.i, currency: "€",
    price: r.p, change30d: r.g, fairValue, liquidity, avgHold, volatility, trend,
    availability: AV[r.a], estimate: !trad,
  };
  if (r.prov) o.provenance = r.prov;
  if (r.ls) o.lastSale = { year: r.ls[0], price: r.ls[1], venue: r.ls[2] };
  return o;
});

/* ===========================================================================
 * FAMILIES — real collectible product lines expanded across the variants that
 * genuinely trade on the market (references, editions, grades). The cross
 * product of refs × grades yields many legitimate, distinct market items
 * (e.g. a 1st-edition PSA 10 Charizard ≠ an Unlimited PSA 8). Prices are
 * modelled from a family base × variant multiplier × grade multiplier.
 * ======================================================================= */

// Grade ladders shared by graded-collectible families.
const PSA = [["PSA 8", 0.32], ["PSA 9", 0.6], ["PSA 10", 1]];
const PSA_HI = [["PSA 7", 0.18], ["PSA 8", 0.34], ["PSA 9", 0.62], ["PSA 10", 1]];

// { base, c, i, p:topPrice€, refs:[[label,mult]], grades?:[[label,mult]] }
const FAMILIES = [
  // ---- Pokémon (graded) ----
  { base: "Pokémon Dracaufeu", c: "Sport", i: "🔥", p: 42000, grades: PSA_HI, refs: [["Base Set 1ère éd.", 1], ["Base Set Shadowless", 0.45], ["Base Set Unlimited", 0.18], ["Skyridge Holo", 0.4], ["Hidden Fates SR", 0.12]] },
  { base: "Pokémon Tortank", c: "Sport", i: "💧", p: 14000, grades: PSA, refs: [["Base Set 1ère éd.", 1], ["Base Set Unlimited", 0.22], ["Shadowless", 0.5]] },
  { base: "Pokémon Florizarre", c: "Sport", i: "🌿", p: 11000, grades: PSA, refs: [["Base Set 1ère éd.", 1], ["Base Set Unlimited", 0.2], ["Shadowless", 0.48]] },
  { base: "Pokémon Pikachu", c: "Sport", i: "⚡", p: 9000, grades: PSA, refs: [["Illustrator promo", 60], ["Base Set", 1], ["Birthday promo", 1.4]] },
  { base: "Pokémon Lugia", c: "Sport", i: "🕊️", p: 12000, grades: PSA, refs: [["Neo Genesis 1ère éd.", 1], ["Neo Genesis Unlimited", 0.3]] },
  { base: "Pokémon Umbreon", c: "Sport", i: "🌙", p: 8000, grades: PSA, refs: [["Gold Star POP 5", 1], ["Skyridge", 0.4], ["Evolving Skies alt art", 0.5]] },
  { base: "Pokémon Rayquaza", c: "Sport", i: "🐉", p: 6000, grades: PSA, refs: [["Gold Star EX Deoxys", 1], ["Evolving Skies alt art", 0.6]] },
  { base: "Pokémon Mewtwo", c: "Sport", i: "🧬", p: 5000, grades: PSA, refs: [["Base Set 1ère éd.", 1], ["Unlimited", 0.25]] },
  { base: "Pokémon Booster scellé", c: "Sport", i: "📦", p: 380000, refs: [["Base Set booster box", 1], ["Jungle booster box", 0.35], ["Fossil booster box", 0.32], ["Base Set booster pack", 0.04]] },

  // ---- Sports cards (graded) ----
  { base: "Michael Jordan", c: "Sport", i: "🏀", p: 90000, grades: PSA, refs: [["1986 Fleer RC", 1], ["1986 Fleer Sticker", 0.35]] },
  { base: "LeBron James", c: "Sport", i: "🏀", p: 120000, grades: PSA, refs: [["2003 Topps Chrome RC", 1], ["2003-04 Upper Deck RC", 0.6]] },
  { base: "Kobe Bryant", c: "Sport", i: "🏀", p: 60000, grades: PSA, refs: [["1996 Topps Chrome RC", 1], ["1996 Finest RC", 0.7]] },
  { base: "Mickey Mantle", c: "Sport", i: "⚾", p: 5000000, grades: PSA, refs: [["1952 Topps #311", 1], ["1953 Topps", 0.06]] },
  { base: "Mike Trout", c: "Sport", i: "⚾", p: 200000, grades: PSA, refs: [["2009 Bowman Chrome RC", 1], ["2011 Topps Update RC", 0.18]] },
  { base: "Tom Brady", c: "Sport", i: "🏈", p: 400000, grades: PSA, refs: [["2000 Bowman Chrome RC", 1], ["2000 Playoff Contenders Auto", 5]] },
  { base: "Lionel Messi", c: "Sport", i: "⚽", p: 80000, grades: PSA, refs: [["2004 Panini Mega Cracks RC", 1], ["2004 Mundicromo RC", 0.4]] },
  { base: "Cristiano Ronaldo", c: "Sport", i: "⚽", p: 70000, grades: PSA, refs: [["2002 Panini Sports Mega RC", 1], ["2003 Futera RC", 0.5]] },
  { base: "Wayne Gretzky", c: "Sport", i: "🏒", p: 250000, grades: PSA, refs: [["1979 O-Pee-Chee RC", 1], ["1979 Topps RC", 0.45]] },

  // ---- Magic: The Gathering ----
  { base: "MTG Black Lotus", c: "Sport", i: "🌸", p: 540000, grades: PSA, refs: [["Alpha", 1], ["Beta", 0.5], ["Unlimited", 0.18]] },
  { base: "MTG Mox", c: "Sport", i: "💍", p: 90000, grades: PSA, refs: [["Sapphire Alpha", 1], ["Jet Alpha", 0.85], ["Ruby Alpha", 0.8], ["Emerald Alpha", 0.75], ["Pearl Alpha", 0.6]] },
  { base: "MTG Ancestral Recall", c: "Sport", i: "🔵", p: 65000, grades: PSA, refs: [["Alpha", 1], ["Beta", 0.5], ["Unlimited", 0.2]] },
  { base: "MTG Time Walk", c: "Sport", i: "⏳", p: 55000, grades: PSA, refs: [["Alpha", 1], ["Beta", 0.5], ["Unlimited", 0.2]] },
  { base: "MTG Dual Land", c: "Sport", i: "🗺️", p: 9000, grades: PSA, refs: [["Underground Sea Alpha", 1], ["Volcanic Island Beta", 0.7], ["Tropical Island Beta", 0.5], ["Tundra Beta", 0.45]] },

  // ---- Watches (references) ----
  { base: "Rolex Submariner", c: "Luxe", i: "⌚", p: 95000, refs: [["réf. 6538 'Big Crown'", 1], ["réf. 5513", 0.22], ["réf. 16610", 0.13], ["réf. 116610LN", 0.16], ["réf. 124060", 0.12]] },
  { base: "Rolex GMT-Master", c: "Luxe", i: "⌚", p: 220000, refs: [["réf. 6542 'Pussy Galore'", 1], ["réf. 1675", 0.12], ["réf. 16710", 0.09], ["réf. 126710 BLRO", 0.1]] },
  { base: "Rolex Daytona", c: "Luxe", i: "⌚", p: 250000, refs: [["réf. 6239 'Paul Newman'", 1], ["réf. 6263", 0.5], ["réf. 116500LN", 0.13], ["réf. 116520", 0.1]] },
  { base: "Rolex Day-Date", c: "Luxe", i: "⌚", p: 85000, refs: [["réf. 1803 or", 1], ["réf. 18238", 0.4], ["réf. 228238", 0.5]] },
  { base: "Patek Philippe Nautilus", c: "Luxe", i: "⌚", p: 280000, refs: [["réf. 3700/1A", 1], ["réf. 5711/1A", 0.48], ["réf. 5712/1A", 0.42], ["réf. 5990/1A", 0.55]] },
  { base: "Patek Philippe Aquanaut", c: "Luxe", i: "⌚", p: 120000, refs: [["réf. 5167A", 0.5], ["réf. 5168G", 0.7], ["réf. 5968A", 1]] },
  { base: "Patek Philippe Calatrava", c: "Luxe", i: "⌚", p: 70000, refs: [["réf. 96 vintage", 1], ["réf. 5196", 0.45], ["réf. 5227", 0.6]] },
  { base: "Audemars Piguet Royal Oak", c: "Luxe", i: "⌚", p: 180000, refs: [["réf. 5402 'A-series'", 1], ["réf. 15202ST", 0.55], ["réf. 15500ST", 0.32], ["réf. 26240 Chrono", 0.4]] },
  { base: "Omega Speedmaster", c: "Luxe", i: "⌚", p: 90000, refs: [["réf. 2915-1 'Broad Arrow'", 1], ["réf. 105.003 'Ed White'", 0.42], ["réf. 145.022", 0.15], ["Moonwatch 310.30", 0.08]] },
  { base: "Omega Seamaster", c: "Luxe", i: "⌚", p: 18000, refs: [["300 vintage CK2913", 1], ["300M 'James Bond'", 0.35], ["Ploprof 1200m", 0.5]] },
  { base: "Cartier Tank", c: "Luxe", i: "⌚", p: 60000, refs: [["Cintrée Platine", 1], ["Louis Cartier or", 0.25], ["Américaine", 0.2]] },

  // ---- Handbags ----
  { base: "Hermès Birkin", c: "Luxe", i: "👜", p: 315000, refs: [["Himalaya croco 30", 1], ["Faubourg 20", 0.4], ["Togo 25", 0.07], ["Togo 35", 0.06], ["Ostrich 30", 0.12]] },
  { base: "Hermès Kelly", c: "Luxe", i: "👜", p: 250000, refs: [["Himalaya croco 25", 1], ["Sellier Epsom 28", 0.1], ["Retourne 32", 0.09], ["Pochette croco", 0.4]] },
  { base: "Chanel Classic Flap", c: "Luxe", i: "👜", p: 40000, refs: [["Diana vintage", 1], ["Medium caviar", 0.24], ["Jumbo agneau", 0.3], ["Maxi", 0.34]] },

  // ---- Art editions / prints ----
  { base: "Andy Warhol", c: "Art", i: "🎨", p: 520000, refs: [["Marilyn (F&S 31)", 1], ["Flowers (F&S 71)", 0.8], ["Campbell's Soup (F&S 47)", 0.7], ["Mao (F&S 91)", 0.75]] },
  { base: "Banksy", c: "Art", i: "🎈", p: 400000, refs: [["Girl with Balloon (signé)", 1], ["Love Is in the Air", 0.7], ["Flower Thrower", 0.75], ["Di-Faced Tenner", 0.5]] },
  { base: "Keith Haring", c: "Art", i: "👶", p: 180000, refs: [["Pop Shop (suite)", 1], ["Andy Mouse", 1.1], ["Retrospect", 0.9]] },
  { base: "Roy Lichtenstein", c: "Art", i: "💥", p: 350000, refs: [["Crying Girl", 1], ["Sweet Dreams Baby", 0.9], ["Reflections", 0.8]] },
  { base: "David Hockney", c: "Art", i: "🏊", p: 120000, refs: [["Pool with Two Figures (print)", 1], ["A Bigger Book", 0.05], ["iPad print", 0.3]] },
  { base: "Yayoi Kusama", c: "Art", i: "🎃", p: 90000, refs: [["Pumpkin (sérigraphie)", 1], ["Infinity Nets print", 0.6], ["Bronze Pumpkin (multiple)", 4]] },
  { base: "Takashi Murakami", c: "Art", i: "🌼", p: 28000, refs: [["Flower (offset)", 1], ["727 print", 1.5], ["DOB print", 1.2]] },
  { base: "KAWS", c: "Art", i: "🧸", p: 120000, refs: [["Companion (Open Edition)", 0.02], ["BFF (vinyl)", 0.06], ["Chum (bronze)", 1], ["The KAWS Album (print)", 0.3]] },
  { base: "Damien Hirst", c: "Art", i: "🔵", p: 90000, refs: [["Spot print", 0.13], ["Butterfly (H-print)", 0.2], ["The Currency (NFT/print)", 0.1], ["Spin painting", 1]] },

  // ---- Vinyl first pressings ----
  { base: "The Beatles", c: "Culture", i: "💿", p: 125000, refs: [["'Yesterday and Today' Butcher scellé", 1], ["'Please Please Me' Gold/Black 1963", 0.6], ["'White Album' #0000005", 0.4], ["'Abbey Road' 1ère presse", 0.05]] },
  { base: "Pink Floyd", c: "Culture", i: "💿", p: 12000, refs: [["'Dark Side' 1ère presse solid blue", 1], ["'Wish You Were Here' promo", 0.5], ["'The Wall' test pressing", 0.7]] },
  { base: "Led Zeppelin", c: "Culture", i: "💿", p: 14000, refs: [["'Led Zeppelin I' turquoise lettering", 1], ["'IV' first UK press", 0.4]] },
  { base: "The Rolling Stones", c: "Culture", i: "💿", p: 9000, refs: [["'Their Satanic Majesties' 3D", 1], ["'Sticky Fingers' zipper", 0.6]] },
  { base: "David Bowie", c: "Culture", i: "💿", p: 8000, refs: [["'Ziggy Stardust' 1ère presse", 1], ["'The Man Who Sold the World' dress sleeve", 1.3]] },

  // ---- Guitars ----
  { base: "Gibson Les Paul", c: "Culture", i: "🎸", p: 450000, refs: [["Standard 1959 'Burst'", 1], ["Standard 1960", 0.85], ["Custom 1957 'Black Beauty'", 0.3]] },
  { base: "Fender Stratocaster", c: "Culture", i: "🎸", p: 90000, refs: [["1954 (1ère année)", 1], ["1962 Pre-CBS", 0.75], ["1969 sunburst", 0.5]] },
  { base: "Fender Telecaster", c: "Culture", i: "🎸", p: 60000, refs: [["1950 Broadcaster", 1], ["1952 blackguard", 0.7]] },
  { base: "Gibson ES-335", c: "Culture", i: "🎸", p: 70000, refs: [["1959 dot-neck", 1], ["1963 block", 0.5]] },

  // ---- Comics (graded) ----
  { base: "Action Comics #1", c: "Culture", i: "🦸", p: 3200000, grades: PSA, refs: [["1938 (Superman)", 1]] },
  { base: "Detective Comics #27", c: "Culture", i: "🦇", p: 1900000, grades: PSA, refs: [["1939 (Batman)", 1]] },
  { base: "Amazing Fantasy #15", c: "Culture", i: "🕷️", p: 3300000, grades: PSA, refs: [["1962 (Spider-Man)", 1]] },
  { base: "Marvel Comics #1", c: "Culture", i: "🔥", p: 1200000, grades: PSA, refs: [["1939", 1]] },
  { base: "X-Men #1", c: "Culture", i: "❌", p: 800000, grades: PSA, refs: [["1963", 1]] },

  // ---- Rare books ----
  { base: "Première édition", c: "Culture", i: "📗", p: 200000, refs: [["Harry Potter à l'école des sorciers (1997)", 0.5], ["The Great Gatsby (1925)", 0.9], ["The Hobbit (1937)", 1], ["1984 — Orwell (1949)", 0.3], ["Le Petit Prince (1943)", 0.25]] },
];

function genFamilies() {
  const items = [];
  let fseed = 1000;
  for (const fam of FAMILIES) {
    const grades = fam.grades ?? [["", 1]];
    for (const [refLabel, refMult] of fam.refs) {
      for (const [gradeLabel, gradeMult] of grades) {
        fseed++;
        const price = Math.max(50, Math.round(fam.p * refMult * gradeMult));
        const name = `${fam.base} — ${refLabel}`;
        const meta = gradeLabel ? `${refLabel} · ${gradeLabel}` : refLabel;
        const g = ((fseed * 37) % 2400) / 100 - 8; // -8 .. +16 %
        const trad = true;
        const fairValue = Math.round(price * (1 - (g / 100) * 0.8 + (((fseed % 5) - 2) * 0.012)));
        let id = slug(`${fam.base}-${refLabel}-${gradeLabel}`);
        while (usedIds.has(id)) id = id + "-" + fseed;
        usedIds.add(id);
        items.push({
          id, name, category: fam.c, meta, icon: fam.i, currency: "€",
          price, change30d: Math.round(g * 10) / 10, fairValue,
          liquidity: price > 500000 ? "Faible" : "Moyenne",
          avgHold: `${2 + (fseed % 8)},0 ans`,
          volatility: VOLC[fam.c], trend: (g >= 0 ? 1 : -1) * (0.001 + Math.abs(g) / 100 * 0.02),
          availability: "Sur le marché", estimate: false,
        });
      }
    }
  }
  return items;
}

const all = out.concat(genFamilies());
const dest = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "catalogue.json");
writeFileSync(dest, JSON.stringify(all, null, 0).replace(/},/g, "},\n") + "\n");
const off = all.filter((o) => !["Sur le marché", "Enchères à venir"].includes(o.availability)).length;
const byCat = {};
all.forEach((o) => (byCat[o.category] = (byCat[o.category] || 0) + 1));
console.log(`catalogue.json: ${all.length} items (${off} off-market) ${JSON.stringify(byCat)} -> ${dest}`);
