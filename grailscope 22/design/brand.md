# GrailScope — Guide de marque

## Positionnement
GrailScope rend lisible le marché des objets de collection de grande valeur (art,
luxe, sport, culture). Hub agrégateur, **sans transaction** : on suit les
tendances, on repère le bon moment, on échange au juste prix.

**Signature** : *Track. Time. Trade fair.* (Suivre. Chronométrer. Échanger juste.)

## Voix
Clair, factuel, confiant — un terminal de marché, pas une salle des ventes. On
explique toujours le « pourquoi » d'un signal. Jamais d'incitation pressante :
GrailScope informe, l'utilisateur décide.

## Logo
- **Lockup complet** : `design/logo.svg` (mark + wordmark + baseline).
- **Mark seul** : `design/logo-mark.svg` (app icon, favicon, avatar).
- Le symbole = une **lentille de visée** (scope) lisant une courbe de prix :
  observation + timing, les deux promesses du produit.
- Zone de protection : au moins la hauteur du « G » autour du lockup.
- Taille mini lisible : mark 24 px, lockup 120 px de large.

## Couleurs
| Rôle | Token | Hex |
|------|-------|-----|
| Fond sombre / marque | `--gs-navy` | `#0b1020` |
| Accent / actions | `--gs-blue` | `#2f6bff` |
| Fin de dégradé | `--gs-teal` | `#16d0a0` |
| Hausse | `--gs-up` | `#0aa66e` |
| Baisse | `--gs-down` | `#e5484d` |
| Neutre (conserver) | `--gs-hold` | `#b07b00` |
| Texte | `--gs-ink` | `#0c1424` |
| Texte secondaire | `--gs-muted` | `#6b7689` |

Dégradé de marque : `linear-gradient(135deg, #2f6bff, #16d0a0)` — réservé au logo,
aux états actifs et aux accents ; jamais sous un grand bloc de texte.

**Règle sémantique** : le vert/rouge ne servent QU'À indiquer la direction du
marché (hausse/baisse, acheter/vendre). Ne jamais les utiliser décorativement.

## Typographie
Pile système (`-apple-system, Segoe UI, Roboto, Helvetica, Arial`). Échelle :
H1 26 · H2 20 · H3 16 · corps 14 · légende 12. Graisses : 800 (titres/chiffres),
700 (labels), 600 (UI), 400 (corps). Les chiffres de cote sont toujours en 700+.

## Composants clés
- **Pilule de signal** : `Acheter` (vert), `Vendre` (rouge), `Conserver` (ambre).
- **Sparkline** : couleur = direction ; trait 2 px, sans axes dans les listes.
- **Carte indice** : niveau en pts + variation 30 j + sparkline.
- **Fiche objet** : prix, signal, graphique 30/60/90 j, juste valeur, écart,
  liquidité, confiance, recommandation argumentée.

## Tokens
Source unique : `design/tokens.css` (variables CSS) et `design/tokens.ts` (objet
typé). Le web les importe ; le mobile les reflète dans `apps/mobile/src/theme.ts`.
