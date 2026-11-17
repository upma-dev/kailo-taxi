import React from 'react';
import { Check } from 'lucide-react';

const STEPS = ['Choose bus', 'Pick seats', 'Passengers', 'Ticket'];

/**
 * Small progress strip shown under the header of every bus booking screen,
 * so riders always know where they are. `current` is 0 to 3.
 */
const BusFlowSteps = ({ current = 0 }) => (
  <ol className="mt-4 flex items-center" aria-label="Booking progress">
    {STEPS.map((label, index) => {
      const done = index < current;
      const active = index === current;
      return (
        <li key={label} className="flex min-w-0 flex-1 items-center last:flex-none">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors ${
                done
                  ? 'bg-[var(--app-primary,#0F766E)] text-white'
                  : active
                    ? 'bg-[#C6F432] text-[#052E2B] ring-4 ring-[#C6F432]/30'
                    : 'bg-slate-100 text-slate-400'
              }`}
            >
              {done ? <Check size={13} strokeWidth={3} /> : index + 1}
            </span>
            <span
              className={`hidden text-[11px] font-bold sm:inline ${
                active ? 'text-slate-900' : done ? 'text-[var(--app-primary,#0F766E)]' : 'text-slate-400'
              }`}
            >
              {label}
            </span>
          </div>
          {index < STEPS.length - 1 && (
            <span className={`mx-2 h-0.5 flex-1 rounded-full ${done ? 'bg-[var(--app-primary,#0F766E)]' : 'bg-slate-100'}`} />
          )}
        </li>
      );
    })}
  </ol>
);

export default BusFlowSteps;
