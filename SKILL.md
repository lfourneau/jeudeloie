---
name: "style-carnet-correspondance"
description: "Direction artistique « carnet de correspondance » du jeu de l'oie pour couples à distance : à appliquer dès qu'on crée ou modifie une interface, un écran ou un composant de ce jeu."
---

# Style « carnet de correspondance »

Le jeu doit ressembler à un carnet de voyage qu'on s'envoie par la poste : papier aquarelle, lavis de couleurs passées, trait d'encre légèrement tremblé, écriture manuscrite, timbres et cachets. Tout doit paraître fait à la main, jamais « appli générique ».

## Principes

1. **Fait main avant tout** : formes aux bords irréguliers, légères rotations (−4° à +4°), rien de parfaitement aligné dans les éléments de jeu. Le texte courant, lui, reste droit et lisible.
2. **Une seule touche vive** : le rouge cachet (#B5442E) est réservé aux éléments postaux (timbres, cachets, villes, résultats importants). Il ne sert jamais de couleur de fond étendue.
3. **L'encre structure, l'aquarelle colore** : contours et texte en encre bleu nuit, jamais en noir pur. Les couleurs viennent des lavis.
4. **Le thème de la distance** : le plateau est un chemin entre deux villes ; les messages sont des lettres ; les cases spéciales sont des timbres.

## Couleurs

```css
:root {
  --encre: #1F2F4A;        /* texte, contours, boutons principaux */
  --encre-claire: #2B4366; /* pion du joueur 1, liens */
  --papier: #EFE6D6;       /* fond de page */
  --papier-lettre: #FBF6EC;/* cartes, lettres, timbres */
  --cachet: #B5442E;       /* timbres, cachets, villes, pion du joueur 2 */
  --lavis-bleu: #9DB4D0;   /* cases « Un chiffre » */
  --ocre: #E6BE6A;         /* cases « Un mot » */
  --rose-poudre: #E8B4A8;  /* cases « Une photo » */
  --sauge: #A9C0A2;        /* cases « Un dessin » */
}
```

Ne jamais introduire de nouvelle couleur vive. Si un nouvel élément a besoin d'une couleur, prendre un lavis existant.

### Lavis aquarelle (dégradé radial à 3 teintes)

```css
/* clair → teinte → bord plus foncé, lumière en haut à gauche */
--lavis-bleu-bg:  radial-gradient(circle at 32% 28%, #CEDBEA 0%, #9DB4D0 58%, #7E99BC 100%);
--ocre-bg:        radial-gradient(circle at 32% 28%, #F4DDA6 0%, #E6BE6A 58%, #D4A443 100%);
--rose-bg:        radial-gradient(circle at 32% 28%, #F6DCD3 0%, #E8B4A8 58%, #D99686 100%);
--sauge-bg:       radial-gradient(circle at 32% 28%, #D3E0CC 0%, #A9C0A2 58%, #8AA583 100%);
```

### Fond de page

Papier avec de grandes taches de lavis très diluées dans les coins :

```css
background-color: #EFE6D6;
background-image:
  radial-gradient(640px 420px at 8% 0%, rgba(157,180,208,.28), transparent 70%),
  radial-gradient(520px 380px at 96% 28%, rgba(232,180,168,.25), transparent 70%),
  radial-gradient(760px 420px at 50% 108%, rgba(230,190,106,.22), transparent 70%);
```

## Typographie

- **Titres, chiffres de cases, boutons, pions** : Kalam (700), écriture manuscrite. Titres principaux légèrement penchés (`rotate(-1.5deg)`).
- **Texte courant** : Spectral (400, 600, italique), comme une lettre soignée. Italique pour les sous-titres et les commentaires de jeu.
- Google Fonts : `family=Kalam:wght@400;700&family=Spectral:ital,wght@0,400;0,600;1,400`
- Échelle : titre de page 64 px, titre d'écran mobile 38 px, titre de carte 28 px, texte 16–18 px, légendes 12–15 px.
- Pas de majuscules partout, pas de police monospace, pas d'emoji.

## Composants

### Case du plateau (taille 84 px)
- Fond : le lavis du type de case. Contour `1.5px solid rgba(31,47,74,.55)`.
- Forme irrégulière, en alternant ces rayons :
  `46% 54% 42% 58% / 52% 44% 56% 48%`, `38% 62% 55% 45% / 45% 55% 45% 55%`, `55% 45% 50% 50% / 40% 60% 42% 58%`, `42% 58% 60% 40% / 58% 42% 50% 50%`.
- Rotation légère et décalage vertical de quelques pixels par case.
- Contenu : numéro en Kalam 24 px en haut à gauche, pions en haut à droite, libellé Spectral 12 px semi-gras en bas.
- Types : Une photo (rose), Un mot (ocre), Un dessin (sauge), Un chiffre (lavis bleu).

### Case spéciale = timbre
- Fond `#FBF6EC`, bordure `2px dashed #B5442E` (perforations), texte rouge cachet.
- Pour : Coup de pouce, On échange, Roue bonus.

### Départ et arrivée = cachet de la poste
- Cercle, fond `#FBF6EC`, bordure `2px solid #B5442E`, nom de la ville en Kalam rouge cachet à côté.

### Chemin du plateau
- Serpentin entre les deux villes, tracé en SVG derrière les cases : `stroke #1F2F4A`, opacité .55, épaisseur 2, `stroke-dasharray: 2 9`, extrémités rondes, petites courbes entre les cases.

### Pions
- Disques de 24–34 px avec l'initiale en Kalam 700. Joueur 1 : fond `#2B4366`, texte papier. Joueur 2 : fond `#B5442E`, texte papier.

### Lettre (carte de message ou de résultat)
```css
background-color: #FBF6EC;
background-image:
  linear-gradient(to right, transparent 52px, rgba(181,68,46,.45) 52px, rgba(181,68,46,.45) 53px, transparent 53px),
  repeating-linear-gradient(to bottom, transparent 0, transparent 31px, rgba(61,90,128,.22) 31px, rgba(61,90,128,.22) 32px);
padding: 24px 28px 24px 72px;
line-height: 32px; /* le texte tombe sur les lignes */
box-shadow: 0 1px 0 rgba(31,47,74,.15), 0 12px 24px -16px rgba(31,47,74,.35);
transform: rotate(-.4deg);
```
Un timbre penché (`rotate(4deg)`) peut décorer le coin supérieur droit.

### Bouton principal
- Fond encre `#1F2F4A`, texte `#FBF6EC`, Kalam 700 20–22 px, sans bordure.
- Forme de pilule irrégulière : `border-radius: 40px 34px 42px 30px / 30px 40px 34px 42px`.
- Libellé = l'action exacte (« Tourner la roue », « Avancer mon pion », « Envoyer ma réponse »).

### Roue
- Sections de tailles **inégales** : plus la moyenne des notes est haute, plus les grands pas prennent de place (exemple pour 4,5/5 : +5 = 90°, +4 = 80°, +3 = 70°, +2 = 60°, +1 = 40°, −1 = 20°).
- `conic-gradient` avec les lavis, puis par-dessus un reflet clair `radial-gradient(circle at 40% 35%, rgba(255,255,255,.4), transparent 55%)` et un léger assombrissement du bord.
- Contour `2px solid #1F2F4A`, cercle de cachet `outline: 2px dashed #B5442E; outline-offset: 9px`.
- Flèche triangulaire en encre en haut, moyeu papier au centre, chiffres en Kalam 26 px.
- Rotation : `transition: transform 2.6s cubic-bezier(.15,.8,.2,1)`, désactivée sous `prefers-reduced-motion`. Résultat annoncé en rouge cachet, dans une zone `aria-live="polite"`.

## Ton des textes

- Français, tutoiement, phrases courtes et chaleureuses, comme une lettre (« Camille t'a envoyé un dessin », « Encore 12 cases avant de se retrouver »).
- Le vocabulaire postal sert de fil conducteur : lettre, timbre, cachet, envoyer.

## À éviter

- Noir pur, gris neutres, dégradés vifs, ombres portées grises uniformes sous chaque carte.
- Cartes identiques arrondies au même rayon partout.
- Angles et alignements parfaits sur les éléments de jeu.
- Emoji, icônes pleines « Material » ; préférer de petits dessins SVG au trait d'encre.

## Accessibilité

- Texte encre sur lavis et papier : contraste suffisant, à garder. Ne jamais mettre de texte clair sur l'ocre, le rose ou la sauge.
- Vrais `<button>`, `<a>`, `<label>` ; focus visible `outline: 2px solid #B5442E; outline-offset: 3px`.
- Cibles tactiles d'au moins 44 px.