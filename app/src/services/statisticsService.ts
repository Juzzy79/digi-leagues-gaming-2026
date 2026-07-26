export interface WarRoomStats {
  global: {
    kdRatio: number;
    winRate: number;
    performanceIndex: number;
    totalKills: number;
    totalDeaths: number;
    totalMatches: number;
  };
  nemesis: {
    activeStreak: number;
    maxStreak: number;
    ultimateRival: string | null;
    rivalStatus: 'WINNER' | 'LOSER' | 'TIE' | null;
    rivalKills: number;
    rivalDeaths: number;
    totalEncounters: number;
  };
  coop: {
    cohesionIndex: number;
    teamKd: number;
    teamWinRate: number;
    teammates: TeammateLeaderboard[];
  };
  advanced: {
    wma10: number;
    netImpactTrend: number[];
    dailyCeiling: number;
    dailyFloor: number;
    dailyAvg: number;
    kdDistribution: Record<string, number>;
    hallOfFame: {
      platinum: any[];
      gold: any[];
      silver: any[];
      bronze: any[];
    };
  };
  racing: {
    uniqueTracks: number;
    lapsCount: number;
    racesCount: number;
    personalBests: Record<string, {
      bestLap?: number;
      bestLapCar?: string;
      totalTime?: number;
      totalTimeCar?: string;
    }>;
  };
}

export interface TeammateLeaderboard {
  name: string;
  matches: number;
  wins: number;
  kills: number;
  deaths: number;
  winRate: number;
  kdRatio: number;
}

export function generateWarRoomStats(history: any[]): WarRoomStats {
  // 1. Global Metrics
  let totalKills = 0;
  let totalDeaths = 0;
  let totalWins = 0;
  let validKdMatches = 0;

  history.forEach(m => {
    if (m.result === 'Win') totalWins++;
    if (m.stats?.kills !== undefined) {
      totalKills += m.stats.kills;
      totalDeaths += m.stats.deaths || 0;
      validKdMatches++;
    }
  });

  const globalKd = totalKills / Math.max(1, totalDeaths);
  const winRate = history.length > 0 ? (totalWins / history.length) * 100 : 0;
  const performanceIndex = ((globalKd / 1.24) * 80) + ((winRate / 50) * 20);

  // 2. Nemesis Metrics
  let activeStreak = 0;
  let maxStreak = 0;
  let currentNemesis = null;
  const rivalStats: Record<string, { encounters: number, killsOn: number, deathsTo: number }> = {};

  const chronHistory = [...history].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  
  chronHistory.forEach(m => {
    if (m.stats?.rival?.name) {
      const rn = m.stats.rival.name;
      if (currentNemesis === rn) {
        activeStreak++;
      } else {
        currentNemesis = rn;
        activeStreak = 1;
      }
      if (activeStreak > maxStreak) maxStreak = activeStreak;

      if (!rivalStats[rn]) {
        rivalStats[rn] = { encounters: 0, killsOn: 0, deathsTo: 0 };
      }
      rivalStats[rn].encounters++;
      rivalStats[rn].killsOn += m.stats.rival.kills_on_rival || 0;
      rivalStats[rn].deathsTo += m.stats.rival.deaths_to_rival || 0;
    } else {
      activeStreak = 0;
      currentNemesis = null;
    }
  });

  let ultimateRival = null;
  let maxEncounters = 0;
  let maxDeathsTo = 0;

  for (const [name, stats] of Object.entries(rivalStats)) {
    if (stats.encounters > maxEncounters || (stats.encounters === maxEncounters && stats.deathsTo > maxDeathsTo)) {
      maxEncounters = stats.encounters;
      maxDeathsTo = stats.deathsTo;
      ultimateRival = name;
    }
  }

  let rivalStatus: 'WINNER' | 'LOSER' | 'TIE' | null = null;
  let rKills = 0;
  let rDeaths = 0;
  if (ultimateRival) {
    const stats = rivalStats[ultimateRival];
    rKills = stats.killsOn;
    rDeaths = stats.deathsTo;
    if (rKills > rDeaths) rivalStatus = 'WINNER';
    else if (rKills < rDeaths) rivalStatus = 'LOSER';
    else rivalStatus = 'TIE';
  }

  // 3. Co-Op Metrics
  let coopMatches = 0;
  let coopWins = 0;
  let teamTotalKills = 0;
  let teamTotalDeaths = 0;
  const teammateStats: Record<string, TeammateLeaderboard> = {};

  history.forEach(m => {
    if (m.stats?.teammates && m.stats.teammates.length > 0) {
      coopMatches++;
      if (m.result === 'Win') coopWins++;

      let matchTeamKills = m.stats.kills || 0;
      let matchTeamDeaths = m.stats.deaths || 0;

      m.stats.teammates.forEach((t: any) => {
        const tk = parseInt(t.kills) || 0;
        const td = parseInt(t.deaths) || 0;
        matchTeamKills += tk;
        matchTeamDeaths += td;

        if (!teammateStats[t.name]) {
          teammateStats[t.name] = { name: t.name, matches: 0, wins: 0, kills: 0, deaths: 0, winRate: 0, kdRatio: 0 };
        }
        teammateStats[t.name].matches++;
        if (m.result === 'Win') teammateStats[t.name].wins++;
        teammateStats[t.name].kills += tk;
        teammateStats[t.name].deaths += td;
      });

      teamTotalKills += matchTeamKills;
      teamTotalDeaths += matchTeamDeaths;
    }
  });

  Object.values(teammateStats).forEach(t => {
    t.winRate = (t.wins / t.matches) * 100;
    t.kdRatio = t.kills / Math.max(1, t.deaths);
  });
  const sortedTeammates = Object.values(teammateStats).sort((a, b) => b.matches - a.matches || b.kdRatio - a.kdRatio);

  const teamKd = teamTotalKills / Math.max(1, teamTotalDeaths);
  const teamWinRate = coopMatches > 0 ? (coopWins / coopMatches) * 100 : 0;
  const cohesionIndex = ((teamKd / 1.24) * 60) + (teamWinRate * 0.4);

  // 4. Advanced Analytics
  const kdMatchesChron = chronHistory.filter(m => m.stats?.kills !== undefined);
  const last10 = kdMatchesChron.slice(-10);
  
  let wmaNumerator = 0;
  let wmaDenominator = 0;
  const netImpactTrend: number[] = [];

  last10.forEach((m, idx) => {
    const k = m.stats.kills || 0;
    const d = m.stats.deaths || 0;
    const kd = k / Math.max(1, d);
    const weight = idx + 1; // 1 to 10
    wmaNumerator += kd * weight;
    wmaDenominator += weight;
    netImpactTrend.push(k - d);
  });

  const wma10 = wmaDenominator > 0 ? wmaNumerator / wmaDenominator : 0;

  const today = new Date().toISOString().split('T')[0];
  const todaysKdMatches = kdMatchesChron.filter(m => m.created_at.startsWith(today));
  let dailyCeiling = 0;
  let dailyFloor = 999;
  let dailyNumerator = 0;

  todaysKdMatches.forEach(m => {
    const kd = (m.stats.kills || 0) / Math.max(1, (m.stats.deaths || 0));
    if (kd > dailyCeiling) dailyCeiling = kd;
    if (kd < dailyFloor) dailyFloor = kd;
    dailyNumerator += kd;
  });
  if (dailyFloor === 999) dailyFloor = 0;
  const dailyAvg = todaysKdMatches.length > 0 ? dailyNumerator / todaysKdMatches.length : 0;

  const kdDistribution = { '0.0-0.5': 0, '0.5-1.0': 0, '1.0-1.5': 0, '1.5-2.0': 0, '2.0-2.5': 0, '2.5-3.0': 0, '3.0+': 0 };
  const hallOfFame = { platinum: [] as any[], gold: [] as any[], silver: [] as any[], bronze: [] as any[] };

  kdMatchesChron.forEach(m => {
    const kd = (m.stats.kills || 0) / Math.max(1, (m.stats.deaths || 0));
    if (kd < 0.5) kdDistribution['0.0-0.5']++;
    else if (kd < 1.0) kdDistribution['0.5-1.0']++;
    else if (kd < 1.5) kdDistribution['1.0-1.5']++;
    else if (kd < 2.0) kdDistribution['1.5-2.0']++;
    else if (kd < 2.5) kdDistribution['2.0-2.5']++;
    else if (kd < 3.0) kdDistribution['2.5-3.0']++;
    else kdDistribution['3.0+']++;

    if (kd >= 3.0) hallOfFame.platinum.push(m);
    else if (kd >= 2.0) hallOfFame.gold.push(m);
    else if (kd >= 1.5) hallOfFame.silver.push(m);
    else hallOfFame.bronze.push(m);
  });

  // 5. Racing Telemetry
  const racingMatches = history.filter(m => m.genre === 'Racing');
  let lapsCount = 0;
  let racesCount = 0;
  const personalBests: Record<string, any> = {};

  racingMatches.forEach(m => {
    const track = m.stats.track_name;
    if (!track) return;
    
    if (m.stats.total_time) racesCount++;
    else lapsCount++; 

    if (!personalBests[track]) {
      personalBests[track] = { bestLap: 999999, totalTime: 999999 };
    }

    if (m.stats.best_lap && m.stats.best_lap < personalBests[track].bestLap) {
      personalBests[track].bestLap = m.stats.best_lap;
      personalBests[track].bestLapCar = m.stats.car_name;
    }
    if (m.stats.total_time && m.stats.total_time < personalBests[track].totalTime) {
      personalBests[track].totalTime = m.stats.total_time;
      personalBests[track].totalTimeCar = m.stats.car_name;
    }
  });

  Object.keys(personalBests).forEach(k => {
    if (personalBests[k].bestLap === 999999) delete personalBests[k].bestLap;
    if (personalBests[k].totalTime === 999999) delete personalBests[k].totalTime;
  });

  return {
    global: {
      kdRatio: globalKd,
      winRate,
      performanceIndex,
      totalKills,
      totalDeaths,
      totalMatches: history.length
    },
    nemesis: {
      activeStreak,
      maxStreak,
      ultimateRival,
      rivalStatus,
      rivalKills: rKills,
      rivalDeaths: rDeaths,
      totalEncounters: maxEncounters
    },
    coop: {
      cohesionIndex,
      teamKd,
      teamWinRate,
      teammates: sortedTeammates
    },
    advanced: {
      wma10,
      netImpactTrend,
      dailyCeiling,
      dailyFloor,
      dailyAvg,
      kdDistribution,
      hallOfFame
    },
    racing: {
      uniqueTracks: Object.keys(personalBests).length,
      lapsCount,
      racesCount,
      personalBests
    }
  };
}
