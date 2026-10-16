'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Popover } from 'radix-ui';
import { calendarDate, calendarDays, calendarLabel, calendarMonthLabel, calendarMove } from '@/lib/calendar-date.mjs';
import styles from './DatePicker.module.css';

type Props = {
  name: string;
  label: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
};

export function DatePicker({ name, label, defaultValue = '', value, onChange, required = false, disabled = false }: Props) {
  const id = useId();
  const [internal, setInternal] = useState(defaultValue);
  const selected = value ?? internal;
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(defaultValue || '2000-01-01');
  const [today, setToday] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const focusedDay = useRef<HTMLButtonElement>(null);
  const moveFocus = useRef(false);
  const days = calendarDays(cursor);

  useEffect(() => {
    if (moveFocus.current) {
      focusedDay.current?.focus();
      moveFocus.current = false;
    }
  }, [cursor]);
  useEffect(() => {
    const form = input.current?.form;
    const reset = (event: Event) => queueMicrotask(() => {
      if (!event.defaultPrevented && value === undefined) setInternal(defaultValue);
    });
    form?.addEventListener('reset', reset);
    return () => form?.removeEventListener('reset', reset);
  }, [defaultValue, value]);

  function changeOpen(next: boolean) {
    if (next) {
      const now = new Date();
      const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      setToday(localToday);
      setCursor(calendarDate(selected) ? selected : localToday);
    }
    setOpen(next);
  }
  function choose(next: string) {
    setInternal(next);
    onChange?.(next);
    setOpen(false);
  }
  function move(next: string) {
    moveFocus.current = true;
    setCursor(next);
  }
  return <div className={styles.field}>
    <label id={`${id}-label`} htmlFor={id}>{label}</label>
    <input ref={input} className={styles.validation} name={name} value={calendarDate(selected) ? selected : ''} onChange={() => {}} required={required} disabled={disabled} tabIndex={-1} aria-hidden="true" onInvalid={event => { event.preventDefault(); changeOpen(true); }} />
    <Popover.Root open={open} onOpenChange={changeOpen} modal>
      <Popover.Trigger asChild><button id={id} type="button" className={styles.trigger} disabled={disabled} aria-labelledby={`${id}-label ${id}-value`}>
        <span id={`${id}-value`}>{calendarLabel(selected) || 'Select a date'}</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 3v4M17 3v4M3 11h18M7 15h2M12 15h2" /></svg>
      </button></Popover.Trigger>
      <Popover.Portal><Popover.Content className={styles.calendar} align="start" sideOffset={8} collisionPadding={12} aria-label={`Choose ${label.toLowerCase()}`} onOpenAutoFocus={event => { event.preventDefault(); focusedDay.current?.focus(); }}>
        <div className={styles.header}>
          <button type="button" onClick={() => move(calendarMove(cursor, 0, -12))} aria-label="Previous year">«</button>
          <button type="button" onClick={() => move(calendarMove(cursor, 0, -1))} aria-label="Previous month">‹</button>
          <strong id={`${id}-month`} aria-live="polite">{calendarMonthLabel(cursor)}</strong>
          <button type="button" onClick={() => move(calendarMove(cursor, 0, 1))} aria-label="Next month">›</button>
          <button type="button" onClick={() => move(calendarMove(cursor, 0, 12))} aria-label="Next year">»</button>
        </div>
        <table role="grid" aria-labelledby={`${id}-month`} className={styles.grid}><thead><tr>{['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(day => <th key={day} scope="col" abbr={day}>{day.slice(0, 2)}</th>)}</tr></thead><tbody>
          {Array.from({ length: 6 }, (_, row) => <tr key={row}>{days.slice(row * 7, row * 7 + 7).map(day => <td key={day} aria-selected={day === selected}><button type="button" ref={day === cursor ? focusedDay : undefined} tabIndex={day === cursor ? 0 : -1} data-outside={day.slice(0, 7) !== cursor.slice(0, 7)} data-selected={day === selected} aria-current={day === today ? 'date' : undefined} aria-label={calendarLabel(day)} onClick={() => choose(day)} onKeyDown={event => {
            const weekday = (calendarDate(day)!.getUTCDay() + 6) % 7;
            const shifts: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -weekday, End: 6 - weekday };
            if (event.key in shifts) { event.preventDefault(); move(calendarMove(day, shifts[event.key])); }
            else if (event.key === 'PageUp' || event.key === 'PageDown') { event.preventDefault(); move(calendarMove(day, 0, (event.key === 'PageUp' ? -1 : 1) * (event.shiftKey ? 12 : 1))); }
          }}>{Number(day.slice(8))}</button></td>)}</tr>)}
        </tbody></table>
        <div className={styles.footer}><button type="button" onClick={() => choose(today)}>Today</button>{!required && <button type="button" onClick={() => choose('')}>Clear</button>}<Popover.Close asChild><button type="button">Close</button></Popover.Close></div>
      </Popover.Content></Popover.Portal>
    </Popover.Root>
  </div>;
}
