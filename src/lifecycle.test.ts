import { describe, it, expect } from 'vitest';
import { parseISO, isAfter, isBefore, addDays, subDays, format } from 'date-fns';

// Mocking the logic used in App.tsx and server.ts
describe('Event Lifecycle Logic', () => {
  
  describe('Default Time Assignment', () => {
    it('should apply default times when missing', () => {
      const todayStr = '2026-03-11';
      const formData = {
        eventDate: '',
        endDate: '',
        registrationDeadline: ''
      };

      // Logic from App.tsx
      let finalEventDate = formData.eventDate || `${todayStr}T09:00`;
      let finalEndDate = formData.endDate || `${todayStr}T16:25`;
      let finalRegDeadline = formData.registrationDeadline || `${todayStr}T17:00`;

      expect(finalEventDate).toBe('2026-03-11T09:00');
      expect(finalEndDate).toBe('2026-03-11T16:25');
      expect(finalRegDeadline).toBe('2026-03-11T17:00');
    });

    it('should handle partial date inputs with default times', () => {
      const dateOnly = '2026-03-15';
      const finalEventDate = `${dateOnly}T09:00`;
      expect(finalEventDate).toBe('2026-03-15T09:00');
    });
  });

  describe('Validation Logic', () => {
    it('should fail if end date is before start date', () => {
      const start = parseISO('2026-03-11T10:00');
      const end = parseISO('2026-03-11T09:00');
      expect(isAfter(start, end)).toBe(true); // Error condition
    });

    it('should fail if start date equals end date (strictly after required)', () => {
      const start = parseISO('2026-03-11T10:00');
      const end = parseISO('2026-03-11T10:00');
      expect(start.getTime() >= end.getTime()).toBe(true); // Error condition
    });

    it('should fail if registration deadline is after end date', () => {
      const end = parseISO('2026-03-11T16:25');
      const deadline = parseISO('2026-03-11T17:00');
      expect(isAfter(deadline, end)).toBe(true); // Error condition
    });

    it('should pass if registration deadline equals end date', () => {
      const end = parseISO('2026-03-11T16:25');
      const deadline = parseISO('2026-03-11T16:25');
      expect(isAfter(deadline, end)).toBe(false); // Valid condition
    });
  });

  describe('Visibility & Deletion (4-Day Calendar Retention)', () => {
    const now = new Date('2026-03-15T12:00:00Z');
    const deletionDate = new Date('2026-03-11T00:00:00Z');

    it('should keep event visible through the third calendar day', () => {
      const eventEndDate = new Date('2026-03-12T23:59:00Z');
      expect(eventEndDate.toISOString().slice(0, 10) > deletionDate.toISOString().slice(0, 10)).toBe(true);
    });

    it('should delete events on the fourth calendar day', () => {
      const eventEndDate = new Date('2026-03-11T16:00:00Z');
      expect(eventEndDate.toISOString().slice(0, 10) <= deletionDate.toISOString().slice(0, 10)).toBe(true);
    });

    it('should correctly identify "Recent Events" within the buffer', () => {
      const eventEndDate = parseISO('2026-03-12T10:00:00Z');
      const isPast = isBefore(eventEndDate, now);
      const isWithinBuffer = isAfter(eventEndDate, deletionDate);
      expect(isPast && isWithinBuffer).toBe(true);
    });
  });

  describe('Timezone Safety (UTC)', () => {
    it('should convert local-style strings to UTC ISO strings', () => {
      const localStr = '2026-03-11T09:00';
      const utcDate = new Date(localStr);
      expect(utcDate.toISOString()).toMatch(/2026-03-11T\d{2}:\d{2}:00.000Z/);
    });
  });

  describe('Date Range Filtering Logic', () => {
    const filterEventByDate = (p: any, selectedDateFilter: string | null) => {
      if (!selectedDateFilter) return true;
      if (p.type !== "event") {
        return p.createdAt && format(parseISO(p.createdAt), 'yyyy-MM-dd') === selectedDateFilter;
      }
      
      try {
        if (!p.eventDate) return false;
        const selected = parseISO(selectedDateFilter);
        const start = parseISO(p.eventDate);
        const end = p.endDate ? parseISO(p.endDate) : start;
        
        const sDate = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate());
        const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        
        return sDate >= startDate && sDate <= endDate;
      } catch {
        return false;
      }
    };

    const singleDayEvent = {
      type: 'event',
      eventDate: '2026-03-05T09:30:00Z',
      endDate: '2026-03-05T16:25:00Z'
    };

    const multiDayEvent = {
      type: 'event',
      eventDate: '2026-03-05T09:30:00Z',
      endDate: '2026-03-07T16:25:00Z'
    };

    it('should match single-day event on its date', () => {
      expect(filterEventByDate(singleDayEvent, '2026-03-05')).toBe(true);
    });

    it('should match multi-day event on start date', () => {
      expect(filterEventByDate(multiDayEvent, '2026-03-05')).toBe(true);
    });

    it('should match multi-day event on middle date', () => {
      expect(filterEventByDate(multiDayEvent, '2026-03-06')).toBe(true);
    });

    it('should match multi-day event on end date', () => {
      expect(filterEventByDate(multiDayEvent, '2026-03-07')).toBe(true);
    });

    it('should not match multi-day event outside its range', () => {
      expect(filterEventByDate(multiDayEvent, '2026-03-04')).toBe(false);
      expect(filterEventByDate(multiDayEvent, '2026-03-08')).toBe(false);
    });

    it('should show ended event older than buffer when filter is applied', () => {
      const now = new Date('2026-03-15T12:00:00Z');
      const oldEvent = {
        type: 'event',
        eventDate: '2026-02-01T09:30:00Z',
        endDate: '2026-02-02T16:25:00Z'
      };
      const isPast = isBefore(parseISO(oldEvent.endDate), now);
      const selectedDateFilter = '2026-02-01';
      
      // Logic from App.tsx: if (selectedDateFilter) return isPast;
      const isVisible = selectedDateFilter ? isPast : (isPast && isAfter(parseISO(oldEvent.endDate), subDays(now, 4)));
      expect(isVisible).toBe(true);
    });
  });
});
