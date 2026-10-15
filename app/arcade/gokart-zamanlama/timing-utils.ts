export type Penalty = { id: string; seconds: 3 | 5 };
export type Driver = {
  id: string;
  name: string;
  car: string;
  laps: number[];
  penalties: Penalty[];
};
export type ScoreMode = 1 | 2 | 3 | 5;
export type ScoredDriver = {
  driver: Driver;
  position: number | null;
  bestMs: number | null;
  baseMs: number | null;
  penaltyMs: number;
  resultMs: number | null;
  lapCount: number;
};
export function formatTime(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms) || ms < 0) return "—";
  const safe = Math.round(ms);
  const mins = Math.floor(safe / 60000);
  const secs = Math.floor((safe % 60000) / 1000);
  const milli = safe % 1000;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(milli).padStart(3, "0")}`;
}
export function parseTime(raw: string): number | null {
  const s = raw.trim().replace(",", ".");
  if (!s) return null;
  const parts = s.split(":");
  if (parts.length > 2) return null;
  let seconds: number;
  if (parts.length === 2) {
    if (!/^\d+$/.test(parts[0]) || !/^\d{1,2}(?:\.\d{1,3})?$/.test(parts[1])) return null;
    const sec = Number(parts[1]);
    if (sec >= 60) return null;
    seconds = Number(parts[0]) * 60 + sec;
  } else {
    if (!/^\d+(?:\.\d{1,3})?$/.test(s)) return null;
    seconds = Number(s);
  }
  const ms = Math.round(seconds * 1000);
  return ms >= 1000 && ms <= 3600000 ? ms : null;
}
export function rankDrivers(drivers: Driver[], bestCount: ScoreMode): ScoredDriver[] {
  const rows = drivers.map(driver => {
    const cleanLaps = driver.laps.filter(ms => Number.isFinite(ms) && ms > 0).sort((a,b)=>a-b);
    const bestMs = cleanLaps.length ? cleanLaps[0] : null;
    const baseMs = cleanLaps.length >= bestCount ? cleanLaps.slice(0, bestCount).reduce((a,b)=>a+b,0) : null;
    const penaltyMs = driver.penalties.reduce((sum,p)=>sum+p.seconds*1000,0);
    return {driver,position:null,bestMs,baseMs,penaltyMs,resultMs:baseMs===null?null:baseMs+penaltyMs,lapCount:cleanLaps.length} satisfies ScoredDriver;
  });
  rows.sort((a,b)=>{
    if(a.resultMs===null && b.resultMs===null) return b.lapCount-a.lapCount || a.driver.name.localeCompare(b.driver.name,'tr');
    if(a.resultMs===null) return 1;
    if(b.resultMs===null) return -1;
    return a.resultMs-b.resultMs || (a.bestMs ?? 0)-(b.bestMs ?? 0) || a.driver.name.localeCompare(b.driver.name,'tr');
  });
  let place = 0;
  return rows.map(row=>({...row,position:row.resultMs===null?null:++place}));
}
export function escapeCsvCell(value:string | number):string {
  const s=String(value);
  const safe=/^[=+@\-\t\r]/.test(s)?"'"+s:s;
  return '"'+safe.replace(/"/g,'""')+'"';
}
