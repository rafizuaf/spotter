export interface GlossaryTerm {
  id: string;
  term: string;
  fullName?: string;
  category: 'intensity' | 'volume' | 'exercise' | 'muscle' | 'form' | 'program';
  definition: string;
  example?: string;
  relatedTerms?: string[];
}

export const GLOSSARY_CATEGORIES = [
  { id: 'intensity', label: 'Intensity & Effort' },
  { id: 'volume', label: 'Volume & Load' },
  { id: 'exercise', label: 'Exercise Types' },
  { id: 'muscle', label: 'Muscle Groups' },
  { id: 'form', label: 'Form & Technique' },
  { id: 'program', label: 'Programming' },
] as const;

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  // Intensity & Effort
  {
    id: 'rpe',
    term: 'RPE',
    fullName: 'Rate of Perceived Exertion',
    category: 'intensity',
    definition: 'A 1-10 scale measuring how hard a set felt. RPE 10 means you could not do another rep (maximum effort). RPE 7 means you had about 3 reps left in the tank.',
    example: 'If you did 8 reps and felt like you could do 2 more, that\'s RPE 8.',
    relatedTerms: ['RIR', 'Failure'],
  },
  {
    id: 'rir',
    term: 'RIR',
    fullName: 'Reps in Reserve',
    category: 'intensity',
    definition: 'How many more reps you could have completed before reaching failure. RIR 0 means you hit failure; RIR 2 means you had 2 reps left.',
    example: 'Stopping at RIR 2 is common for building strength without excessive fatigue.',
    relatedTerms: ['RPE', 'Failure'],
  },
  {
    id: 'failure',
    term: 'Failure',
    fullName: 'Muscular Failure',
    category: 'intensity',
    definition: 'The point where you cannot complete another rep with proper form. Training to failure maximizes muscle recruitment but increases recovery time.',
    example: 'Going to failure on the last set of an exercise can be effective for hypertrophy.',
    relatedTerms: ['RPE', 'RIR'],
  },
  {
    id: '1rm',
    term: '1RM',
    fullName: 'One Rep Max',
    category: 'intensity',
    definition: 'The maximum weight you can lift for a single repetition with proper form. Used to calculate training percentages and track strength progress.',
    example: 'If your bench press 1RM is 100kg, working at 80% means using 80kg.',
    relatedTerms: ['Training Max', 'PR'],
  },
  {
    id: 'training-max',
    term: 'Training Max',
    fullName: 'Training Maximum',
    category: 'intensity',
    definition: 'A conservative estimate (usually 85-90% of true 1RM) used for programming. Allows for progressive overload while maintaining form quality.',
    example: 'If your 1RM is 100kg, your training max might be 90kg for safer programming.',
    relatedTerms: ['1RM', 'Progressive Overload'],
  },

  // Volume & Load
  {
    id: 'volume',
    term: 'Volume',
    fullName: 'Training Volume',
    category: 'volume',
    definition: 'Total amount of work performed, calculated as Sets × Reps × Weight. Higher volume generally leads to more muscle growth, up to a point.',
    example: '3 sets of 10 reps at 50kg = 1,500kg total volume.',
    relatedTerms: ['Sets', 'Reps', 'Progressive Overload'],
  },
  {
    id: 'progressive-overload',
    term: 'Progressive Overload',
    category: 'volume',
    definition: 'Gradually increasing training demands over time to continue making progress. Can be achieved by adding weight, reps, sets, or reducing rest time.',
    example: 'Adding 2.5kg to your squat each week is progressive overload.',
    relatedTerms: ['Volume', 'Deload'],
  },
  {
    id: 'deload',
    term: 'Deload',
    fullName: 'Deload Week',
    category: 'volume',
    definition: 'A planned reduction in training intensity or volume to allow recovery and prevent overtraining. Typically every 4-8 weeks.',
    example: 'During a deload, you might use 50% of your normal weight or halve your sets.',
    relatedTerms: ['Progressive Overload', 'Recovery'],
  },
  {
    id: 'pr',
    term: 'PR',
    fullName: 'Personal Record',
    category: 'volume',
    definition: 'Your best-ever performance on an exercise. Can be a weight PR (heaviest), rep PR (most reps at a weight), or volume PR.',
    example: 'Hitting 100kg for 5 reps when your previous best was 100kg for 4 reps is a rep PR.',
    relatedTerms: ['1RM', 'Progressive Overload'],
  },

  // Exercise Types
  {
    id: 'compound',
    term: 'Compound',
    fullName: 'Compound Exercise',
    category: 'exercise',
    definition: 'An exercise that works multiple muscle groups and joints simultaneously. Generally more efficient for building overall strength.',
    example: 'Squats, deadlifts, bench press, and rows are compound exercises.',
    relatedTerms: ['Isolation', 'Primary Mover'],
  },
  {
    id: 'isolation',
    term: 'Isolation',
    fullName: 'Isolation Exercise',
    category: 'exercise',
    definition: 'An exercise targeting a single muscle group with movement at one joint. Good for addressing weak points or adding extra volume.',
    example: 'Bicep curls, leg extensions, and lateral raises are isolation exercises.',
    relatedTerms: ['Compound', 'Accessory'],
  },
  {
    id: 'superset',
    term: 'Superset',
    category: 'exercise',
    definition: 'Performing two exercises back-to-back with no rest between them. Often pairs opposing muscle groups or different body parts.',
    example: 'Bench press immediately followed by rows is an antagonist superset.',
    relatedTerms: ['Drop Set', 'Rest Time'],
  },
  {
    id: 'drop-set',
    term: 'Drop Set',
    category: 'exercise',
    definition: 'Performing a set to failure, then immediately reducing weight and continuing for more reps. Increases time under tension and metabolic stress.',
    example: 'Curling 15kg to failure, dropping to 10kg, then to 5kg without rest.',
    relatedTerms: ['Superset', 'Failure'],
  },

  // Form & Technique
  {
    id: 'tempo',
    term: 'Tempo',
    fullName: 'Lifting Tempo',
    category: 'form',
    definition: 'The speed of each phase of a rep, written as 4 numbers: eccentric-pause-concentric-pause (in seconds). Controls time under tension.',
    example: '3-1-1-0 means 3 seconds lowering, 1 second pause, 1 second lifting, no pause at top.',
    relatedTerms: ['Eccentric', 'Concentric'],
  },
  {
    id: 'eccentric',
    term: 'Eccentric',
    fullName: 'Eccentric Phase',
    category: 'form',
    definition: 'The lowering or lengthening phase of a lift where the muscle lengthens under tension. Also called the "negative" phase.',
    example: 'Lowering the bar to your chest during bench press is the eccentric phase.',
    relatedTerms: ['Concentric', 'Tempo'],
  },
  {
    id: 'concentric',
    term: 'Concentric',
    fullName: 'Concentric Phase',
    category: 'form',
    definition: 'The lifting or shortening phase where the muscle contracts and shortens. This is where you exert force to move the weight.',
    example: 'Pushing the bar up during bench press is the concentric phase.',
    relatedTerms: ['Eccentric', 'Tempo'],
  },
  {
    id: 'rom',
    term: 'ROM',
    fullName: 'Range of Motion',
    category: 'form',
    definition: 'The full extent of movement at a joint during an exercise. Full ROM typically provides better muscle development.',
    example: 'Full ROM on squats means going deep enough that your thighs are at least parallel.',
    relatedTerms: ['Depth', 'Partial Reps'],
  },

  // Programming
  {
    id: 'split',
    term: 'Split',
    fullName: 'Training Split',
    category: 'program',
    definition: 'How you organize workouts throughout the week. Common splits include full body, upper/lower, and push/pull/legs (PPL).',
    example: 'A PPL split has you train pushing muscles, pulling muscles, and legs on separate days.',
    relatedTerms: ['PPL', 'Full Body'],
  },
  {
    id: 'ppl',
    term: 'PPL',
    fullName: 'Push Pull Legs',
    category: 'program',
    definition: 'A training split organizing workouts by movement pattern: pushing (chest, shoulders, triceps), pulling (back, biceps), and legs.',
    example: 'A 6-day PPL runs: Push, Pull, Legs, Push, Pull, Legs, Rest.',
    relatedTerms: ['Split', 'Upper Lower'],
  },
  {
    id: 'amrap',
    term: 'AMRAP',
    fullName: 'As Many Reps As Possible',
    category: 'program',
    definition: 'A set where you perform as many reps as you can with good form. Often the final set of an exercise to gauge progress.',
    example: 'An AMRAP set at 80% 1RM tests how many reps you can get at that weight.',
    relatedTerms: ['RPE', 'Failure'],
  },
];

export function searchGlossary(query: string): GlossaryTerm[] {
  const lowerQuery = query.toLowerCase().trim();
  if (!lowerQuery) return GLOSSARY_TERMS;

  return GLOSSARY_TERMS.filter(term =>
    term.term.toLowerCase().includes(lowerQuery) ||
    term.fullName?.toLowerCase().includes(lowerQuery) ||
    term.definition.toLowerCase().includes(lowerQuery)
  );
}

export function getTermById(id: string): GlossaryTerm | undefined {
  return GLOSSARY_TERMS.find(term => term.id === id);
}

export function getTermsByCategory(category: GlossaryTerm['category']): GlossaryTerm[] {
  return GLOSSARY_TERMS.filter(term => term.category === category);
}
