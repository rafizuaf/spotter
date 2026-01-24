/**
 * Phase 2D: Hevy import – exercise matcher and helpers.
 */

import {
  matchExercise,
  normalizeExerciseName,
  extractBaseName,
} from '../src/services/importers';

const mockLibrary = new Map([
  ['incline barbell bench press', { serverId: 's1', localId: 'l1', name: 'Incline Barbell Bench Press' }],
  ['pullup', { serverId: 's2', localId: 'l2', name: 'Pull-Up' }],
  ['pendlay row', { serverId: 's3', localId: 'l3', name: 'Pendlay Row' }],
  ['hanging leg raise', { serverId: 's4', localId: 'l4', name: 'Hanging Leg Raise' }],
]);

describe('Hevy import', () => {
  describe('normalizeExerciseName', () => {
    it('lowercases and strips parentheticals', () => {
      expect(normalizeExerciseName('Incline Bench Press (Barbell)')).toBe('incline bench press');
    });
  });

  describe('extractBaseName', () => {
    it('strips equipment in parentheses', () => {
      expect(extractBaseName('Incline Bench Press (Barbell)')).toBe('Incline Bench Press');
    });
  });

  describe('matchExercise', () => {
    it('returns match for Hevy-mapped name when in library', () => {
      const r = matchExercise('Incline Bench Press (Barbell)', mockLibrary);
      expect(r.exerciseId).toBe('s1');
      expect(r.localId).toBe('l1');
      expect(r.exerciseName).toBe('Incline Barbell Bench Press');
      expect(r.confidence).toBe(1);
      expect(r.suggestedCreate).toBe(false);
    });

    it('returns suggestedCreate for unknown exercise', () => {
      const r = matchExercise('Bayesian Curl', mockLibrary);
      expect(r.exerciseId).toBeNull();
      expect(r.localId).toBeNull();
      expect(r.exerciseName).toBe('Bayesian Curl');
      expect(r.suggestedCreate).toBe(true);
    });
  });
});
