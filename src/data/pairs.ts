// The 25 hero/object pairs, exactly as listed in the game description (Խաղ.docx).
export interface Pair {
  id: string;
  hero: string; // Armenian name shown under the hero portrait
  object: string; // Armenian name shown under the object picture
  objectArt: string; // file name in src/art/objects/<objectArt>.svg
}

export const PAIRS: Pair[] = [
  { id: 'noah', hero: 'Նոյ', object: 'Տապան', objectArt: 'ark' },
  { id: 'abraham', hero: 'Աբրահամ', object: 'Խոյ', objectArt: 'ram' },
  { id: 'moses', hero: 'Մովսես', object: 'Գավազան', objectArt: 'staff' },
  { id: 'joshua', hero: 'Հեսու', object: 'Երիքովի պարիսպ', objectArt: 'jericho-walls' },
  { id: 'gideon', hero: 'Գեդեոն', object: 'Ջահ', objectArt: 'torch' },
  { id: 'samson', hero: 'Սամսոն', object: 'Սյուներ', objectArt: 'pillars' },
  { id: 'david', hero: 'Դավիթ', object: 'Պարսատիկ', objectArt: 'sling' },
  { id: 'solomon', hero: 'Սողոմոն', object: 'Տաճար', objectArt: 'temple' },
  { id: 'elijah', hero: 'Եղիա', object: 'Կրակ', objectArt: 'fire' },
  { id: 'elisha', hero: 'Եղիսե', object: 'Մանուկի հարություն', objectArt: 'child-raised' },
  { id: 'daniel', hero: 'Դանիել', object: 'Առյուծներ', objectArt: 'lions' },
  { id: 'jonah', hero: 'Հովնան', object: 'Մեծ ձուկ', objectArt: 'big-fish' },
  { id: 'esther', hero: 'Եսթեր', object: 'Թագ', objectArt: 'crown' },
  { id: 'joseph', hero: 'Հովսեփ', object: 'Գունավոր պատմուճան', objectArt: 'coat' },
  { id: 'ruth', hero: 'Ռութ', object: 'Հասկերի արտ', objectArt: 'wheat-field' },
  { id: 'peter', hero: 'Պետրոս', object: 'Ձկնորսական ցանց', objectArt: 'fishing-net' },
  { id: 'thomas', hero: 'Թովմաս', object: 'Մեխ', objectArt: 'nail' },
  { id: 'matthew', hero: 'Մատթեոս', object: 'Դրամ', objectArt: 'coin' },
  { id: 'paul', hero: 'Պողոս', object: 'Շղթաներ', objectArt: 'chains' },
  { id: 'john-baptist', hero: 'Հովհաննես Մկրտիչ', object: 'Մորեխ և մեղր', objectArt: 'locust-honey' },
  { id: 'mary', hero: 'Մարիամ', object: 'Շուշան', objectArt: 'lily' },
  { id: 'martha', hero: 'Մարթա', object: 'Սպասք / սպասավորություն', objectArt: 'dishes' },
  { id: 'zacchaeus', hero: 'Զաքեոս', object: 'Թզենի', objectArt: 'fig-tree' },
  { id: 'samaritan-woman', hero: 'Սամարացի կինը', object: 'Ջրհոր', objectArt: 'well' },
  { id: 'balaam', hero: 'Բաղաամ', object: 'Էշ', objectArt: 'donkey' },
];

export const PAIR_BY_ID: Record<string, Pair> = Object.fromEntries(PAIRS.map((p) => [p.id, p]));
