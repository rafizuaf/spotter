/**
 * Error Handler Tests
 * 
 * Tests for error parsing and handling utilities
 */

import {
  parseError,
  createAppError,
  isAppError,
  ErrorCodes,
} from '../src/utils/errorHandler';

describe('Error Handler', () => {
  describe('parseError', () => {
    it('should parse standard Error objects', () => {
      const error = new Error('Test error');
      const result = parseError(error);

      expect(result.code).toBe(ErrorCodes.UNKNOWN);
      expect(result.message).toBe('Test error');
      expect(result.originalError).toBe(error);
    });

    it('should parse network errors', () => {
      const error = new TypeError('Network request failed');
      const result = parseError(error);

      expect(result.code).toBe(ErrorCodes.NETWORK_ERROR);
      expect(result.message).toContain('Network');
    });

    it('should parse timeout errors', () => {
      const error = new Error('Request timeout');
      const result = parseError(error);

      expect(result.code).toBe(ErrorCodes.TIMEOUT);
    });

    it('should parse string errors', () => {
      const error = 'String error';
      const result = parseError(error);

      expect(result.code).toBe(ErrorCodes.UNKNOWN);
      expect(result.message).toBe('String error');
    });

    it('should handle AppError objects', () => {
      const appError = createAppError(ErrorCodes.VALIDATION_ERROR, 'Invalid input');
      const result = parseError(appError);

      expect(result).toBe(appError);
      expect(result.code).toBe(ErrorCodes.VALIDATION_ERROR);
    });
  });

  describe('createAppError', () => {
    it('should create AppError with code and message', () => {
      const error = createAppError(ErrorCodes.NETWORK_ERROR, 'Connection failed');

      expect(error.code).toBe(ErrorCodes.NETWORK_ERROR);
      expect(error.message).toBe('Connection failed');
      expect(isAppError(error)).toBe(true);
    });

    it('should include original error if provided', () => {
      const originalError = new Error('Original');
      const error = createAppError(ErrorCodes.UNKNOWN, 'Wrapped', originalError);

      expect(error.originalError).toBe(originalError);
    });
  });

  describe('isAppError', () => {
    it('should return true for AppError objects', () => {
      const error = createAppError(ErrorCodes.UNKNOWN, 'Test');
      expect(isAppError(error)).toBe(true);
    });

    it('should return false for standard Error objects', () => {
      const error = new Error('Test');
      expect(isAppError(error)).toBe(false);
    });
  });
});
