import { useState } from 'react';
import { Repeat } from 'lucide-react';
import { RecurrenceType, RecurrenceConfig } from '@/types/task';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface RecurrencePickerProps {
  recurrenceType: RecurrenceType;
  recurrenceConfig?: RecurrenceConfig;
  onChange: (type: RecurrenceType, config?: RecurrenceConfig) => void;
}

export function RecurrencePicker({ recurrenceType, recurrenceConfig, onChange }: RecurrencePickerProps) {
  const [open, setOpen] = useState(false);
  const [localType, setLocalType] = useState<RecurrenceType>(recurrenceType);
  const [weekDays, setWeekDays] = useState<number[]>(recurrenceConfig?.weekDays || [1]); // default Monday
  const [monthDay, setMonthDay] = useState(recurrenceConfig?.monthDay || 1);
  const [monthWeek, setMonthWeek] = useState(recurrenceConfig?.monthWeekday?.week || 1);
  const [monthWeekday, setMonthWeekday] = useState(recurrenceConfig?.monthWeekday?.day || 1);
  const [customInterval, setCustomInterval] = useState(recurrenceConfig?.interval || 1);
  const [customUnit, setCustomUnit] = useState<'days' | 'weeks' | 'months'>(recurrenceConfig?.intervalUnit || 'days');

  const apply = (type: RecurrenceType) => {
    setLocalType(type);
    if (!type) { onChange(null); setOpen(false); return; }
    
    let config: RecurrenceConfig | undefined;
    switch (type) {
      case 'daily': break;
      case 'weekly': config = { weekDays }; break;
      case 'monthly_day': config = { monthDay }; break;
      case 'monthly_weekday': config = { monthWeekday: { week: monthWeek, day: monthWeekday } }; break;
      case 'custom': config = { interval: customInterval, intervalUnit: customUnit }; break;
    }
    onChange(type, config);
    setOpen(false);
  };

  const toggleWeekDay = (d: number) => {
    setWeekDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort());
  };

  const label = getRecurrenceLabel(recurrenceType, recurrenceConfig);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`h-8 px-2 text-[14px] md:text-[14px] rounded border border-transparent focus:border-nd-border-input focus:outline-none flex items-center gap-1.5 transition-colors ${
            recurrenceType
              ? 'text-primary bg-primary/10'
              : 'text-nd-text bg-nd-input hover:border-nd-border-input'
          }`}
        >
          <Repeat className="w-3.5 h-3.5" />
          <span className="text-[12px]">{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="w-64 p-3 space-y-2">
        <p className="text-[12px] font-semibold text-foreground mb-2">Repetir</p>

        {/* Quick options */}
        {([
          { type: null as RecurrenceType, label: 'Não repetir' },
          { type: 'daily' as RecurrenceType, label: 'Todo dia' },
        ]).map(opt => (
          <button
            key={String(opt.type)}
            onClick={() => apply(opt.type)}
            className={`w-full h-8 px-2 text-left text-[12px] rounded transition-colors ${
              localType === opt.type ? 'bg-primary/15 text-primary' : 'text-foreground hover:bg-muted'
            }`}
          >
            {opt.label}
          </button>
        ))}

        {/* Weekly */}
        <div>
          <button
            onClick={() => setLocalType('weekly')}
            className={`w-full h-8 px-2 text-left text-[12px] rounded transition-colors ${
              localType === 'weekly' ? 'bg-primary/15 text-primary' : 'text-foreground hover:bg-muted'
            }`}
          >
            Toda semana em...
          </button>
          {localType === 'weekly' && (
            <div className="flex gap-1 mt-1.5 pl-2">
              {WEEKDAY_LABELS.map((label, i) => (
                <button
                  key={i}
                  onClick={() => toggleWeekDay(i)}
                  className={`w-7 h-7 rounded text-[10px] font-medium transition-colors ${
                    weekDays.includes(i) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
              <button onClick={() => apply('weekly')} className="ml-1 text-[10px] text-primary font-medium">OK</button>
            </div>
          )}
        </div>

        {/* Monthly day */}
        <div>
          <button
            onClick={() => setLocalType('monthly_day')}
            className={`w-full h-8 px-2 text-left text-[12px] rounded transition-colors ${
              localType === 'monthly_day' ? 'bg-primary/15 text-primary' : 'text-foreground hover:bg-muted'
            }`}
          >
            Todo mês no dia...
          </button>
          {localType === 'monthly_day' && (
            <div className="flex items-center gap-2 mt-1.5 pl-2">
              <span className="text-[11px] text-muted-foreground">Dia</span>
              <input
                type="number"
                min={1}
                max={31}
                value={monthDay}
                onChange={(e) => setMonthDay(Number(e.target.value))}
                className="w-14 h-7 px-1.5 text-[12px] text-foreground bg-muted rounded border-none focus:outline-none text-center"
              />
              <button onClick={() => apply('monthly_day')} className="text-[10px] text-primary font-medium">OK</button>
            </div>
          )}
        </div>

        {/* Monthly weekday */}
        <div>
          <button
            onClick={() => setLocalType('monthly_weekday')}
            className={`w-full h-8 px-2 text-left text-[12px] rounded transition-colors ${
              localType === 'monthly_weekday' ? 'bg-primary/15 text-primary' : 'text-foreground hover:bg-muted'
            }`}
          >
            Todo mês na...
          </button>
          {localType === 'monthly_weekday' && (
            <div className="flex items-center gap-2 mt-1.5 pl-2 flex-wrap">
              <select
                value={monthWeek}
                onChange={(e) => setMonthWeek(Number(e.target.value))}
                className="h-7 px-1.5 text-[11px] text-foreground bg-muted rounded border-none focus:outline-none"
              >
                <option value={1}>1ª</option>
                <option value={2}>2ª</option>
                <option value={3}>3ª</option>
                <option value={4}>4ª</option>
              </select>
              <select
                value={monthWeekday}
                onChange={(e) => setMonthWeekday(Number(e.target.value))}
                className="h-7 px-1.5 text-[11px] text-foreground bg-muted rounded border-none focus:outline-none"
              >
                {WEEKDAY_LABELS.map((l, i) => <option key={i} value={i}>{l}</option>)}
              </select>
              <button onClick={() => apply('monthly_weekday')} className="text-[10px] text-primary font-medium">OK</button>
            </div>
          )}
        </div>

        {/* Custom */}
        <div>
          <button
            onClick={() => setLocalType('custom')}
            className={`w-full h-8 px-2 text-left text-[12px] rounded transition-colors ${
              localType === 'custom' ? 'bg-primary/15 text-primary' : 'text-foreground hover:bg-muted'
            }`}
          >
            Personalizado
          </button>
          {localType === 'custom' && (
            <div className="flex items-center gap-2 mt-1.5 pl-2">
              <span className="text-[11px] text-muted-foreground">A cada</span>
              <input
                type="number"
                min={1}
                value={customInterval}
                onChange={(e) => setCustomInterval(Number(e.target.value))}
                className="w-12 h-7 px-1.5 text-[12px] text-foreground bg-muted rounded border-none focus:outline-none text-center"
              />
              <select
                value={customUnit}
                onChange={(e) => setCustomUnit(e.target.value as 'days' | 'weeks' | 'months')}
                className="h-7 px-1.5 text-[11px] text-foreground bg-muted rounded border-none focus:outline-none"
              >
                <option value="days">dias</option>
                <option value="weeks">semanas</option>
                <option value="months">meses</option>
              </select>
              <button onClick={() => apply('custom')} className="text-[10px] text-primary font-medium">OK</button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function getRecurrenceLabel(type: RecurrenceType, config?: RecurrenceConfig): string {
  if (!type) return 'Não repete';
  switch (type) {
    case 'daily': return 'Todo dia';
    case 'weekly': {
      const days = config?.weekDays?.map(d => WEEKDAY_LABELS[d]).join(', ') || '';
      return `Semanal (${days})`;
    }
    case 'monthly_day': return `Mensal (dia ${config?.monthDay || '?'})`;
    case 'monthly_weekday': {
      const w = config?.monthWeekday;
      return `Mensal (${w?.week || '?'}ª ${WEEKDAY_LABELS[w?.day || 0]})`;
    }
    case 'custom': {
      const u = config?.intervalUnit === 'days' ? 'dias' : config?.intervalUnit === 'weeks' ? 'sem.' : 'meses';
      return `A cada ${config?.interval || '?'} ${u}`;
    }
    default: return 'Repete';
  }
}
