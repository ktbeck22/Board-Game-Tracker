import React, { useState } from "react";

// Tie-aware placement calculation (unchanged)
function getPlacements(scoresArr) {
  const sorted = [...scoresArr].sort((a, b) => b.score - a.score);
  let placements = {};
  let place = 1;
  let prevScore = null;
  let samePlaceCount = 0;

  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i];
    if (prevScore !== null && s.score === prevScore) {
      samePlaceCount++;
    } else {
      place = i + 1;
      samePlaceCount = 1;
    }
    placements[s.name] = place;
    prevScore = s.score;
  }
  return placements;
}

function getGameScores(scoresArr) {
  // Sort descending by score
  const sorted = [...scoresArr].sort((a, b) => b.score - a.score);
  let placeToNames = {};
  let prevScore = null;
  let place = 1;
  for (let i = 0; i < sorted.length; i++) {
    if (prevScore === null || sorted[i].score !== prevScore) {
      place = i + 1;
    }
    if (!placeToNames[place]) placeToNames[place] = [];
    placeToNames[place].push(sorted[i].name);
    prevScore = sorted[i].score;
  }
  const n = scoresArr.length;
  const slotCount = n - 1;
  const placeToGameScore = {};
  if (n === 1) {
    placeToGameScore[1] = 100;
  } else {
    let usedRanks = 0;
    for (let p = 1; p <= n; ++p) {
      if (placeToNames[p]) {
        let gameScore = slotCount === 0 ? 100 : Math.round((1 - (usedRanks / slotCount)) * 100);
        placeToGameScore[p] = gameScore;
        usedRanks += placeToNames[p].length;
      }
    }
  }
  const result = {};
  for (const [place, names] of Object.entries(placeToNames)) {
    for (const name of names) {
      result[name] = placeToGameScore[place];
    }
  }
  return result;
}

function getWeightedGameScores(scoresArr) {
  if (!scoresArr.length) return {};
  const values = scoresArr.map(s => s.score);
  const min = Math.min(...values);
  const max = Math.max(...values);
  // Avoid division by zero: if all same, everyone gets 100
  if (max === min) {
    return Object.fromEntries(scoresArr.map(s => [s.name, 100]));
  }
  const out = {};
  scoresArr.forEach(s => {
    out[s.name] = Math.round(((s.score - min) / (max - min)) * 100);
  });
  return out;
}

function getGameDominance(scoresArr) {
  const total = scoresArr.reduce((sum, s) => sum + s.score, 0);
  if (total === 0) {
    // Avoid division by zero: all zero means everyone gets 0 dominance
    return Object.fromEntries(scoresArr.map(s => [s.name, 0]));
  }
  const out = {};
  scoresArr.forEach(s => {
    out[s.name] = Number(((s.score / total) * 100).toFixed(2));
  });
  return out;
}

function getTeamPlacements(scoresArr) {
  // If no "team" property, fallback to regular placements
  if (!scoresArr.some(s => s.team)) return getPlacements(scoresArr);

  // Group by team
  const teams = {};
  scoresArr.forEach(s => {
    if (!teams[s.team]) teams[s.team] = [];
    teams[s.team].push(s);
  });
  // Each team's score is the score of one member (all must be equal)
  const teamList = Object.entries(teams).map(([team, players]) => ({
    team,
    score: players[0].score,
    names: players.map(p => p.name)
  }));
  // Sort by score
  teamList.sort((a, b) => b.score - a.score);

  // Calculate placements with ties
  let placements = {};
  let place = 1;
  let prevScore = null;
  let samePlaceCount = 0;
  for (let i = 0; i < teamList.length; i++) {
    const t = teamList[i];
    if (prevScore !== null && t.score === prevScore) {
      samePlaceCount++;
    } else {
      place = i + 1;
      samePlaceCount = 1;
    }
    t.names.forEach(n => placements[n] = place);
    prevScore = t.score;
  }
  return placements;
}

function getTeamDominance(scoresArr) {
  // If no "team" property, fallback to regular dominance
  if (!scoresArr.some(s => s.team)) return getGameDominance(scoresArr);

  // Group by team
  const teams = {};
  scoresArr.forEach(s => {
    if (!teams[s.team]) teams[s.team] = [];
    teams[s.team].push(s);
  });
  const teamScores = Object.values(teams).map(team => team[0].score);
  const total = teamScores.reduce((a, b) => a + b, 0);
  let teamDominance = {};
  Object.entries(teams).forEach(([teamId, teamPlayers]) => {
    const dom = total === 0 ? 0 : Number(((teamPlayers[0].score / total) * 100).toFixed(2));
    teamPlayers.forEach(p => {
      teamDominance[p.name] = dom;
    });
  });
  return teamDominance;
}

function getTeamGameScores(scoresArr) {
  // If no "team" property, fallback to regular getGameScores
  if (!scoresArr.some(s => s.team)) return getGameScores(scoresArr);

  // Group by team
  const teams = {};
  scoresArr.forEach(s => {
    if (!teams[s.team]) teams[s.team] = [];
    teams[s.team].push(s);
  });
  // Prepare team score objects
  const teamList = Object.entries(teams).map(([team, players]) => ({
    team,
    score: players[0].score,
    names: players.map(p => p.name)
  }));

  // Sort by score, highest first
  teamList.sort((a, b) => b.score - a.score);

  // Assign placements (with ties)
  let placeToNames = {};
  let prevScore = null;
  let place = 1;
  for (let i = 0; i < teamList.length; i++) {
    if (prevScore === null || teamList[i].score !== prevScore) {
      place = i + 1;
    }
    if (!placeToNames[place]) placeToNames[place] = [];
    placeToNames[place].push(...teamList[i].names);
    prevScore = teamList[i].score;
  }
  const n = teamList.length;
  const slotCount = n - 1;
  const placeToGameScore = {};
  if (n === 1) {
    placeToGameScore[1] = 100;
  } else {
    let usedRanks = 0;
    for (let p = 1; p <= n; ++p) {
      if (placeToNames[p]) {
        let gameScore = slotCount === 0 ? 100 : Math.round((1 - (usedRanks / slotCount)) * 100);
        placeToGameScore[p] = gameScore;
        usedRanks += placeToNames[p].length;
      }
    }
  }
  const result = {};
  for (const [place, names] of Object.entries(placeToNames)) {
    for (const name of names) {
      result[name] = placeToGameScore[place];
    }
  }
  return result;
}

function getLeaderboard(gameSessions, players) {
  const scores = {};
  const placements = {};
  const gameScoresArr = {};
  const weightedGameScoresArr = {};
  const dominanceArr = {}; 
  players.forEach(name => {
    scores[name] = { gamesPlayed: 0, wins: 0 };
    placements[name] = [];
    gameScoresArr[name] = [];
    weightedGameScoresArr[name] = [];
    dominanceArr[name] = [];
  });
  gameSessions.forEach(({ scores: sessionScores }) => {
    const placeMap = getTeamPlacements(sessionScores);
    const gScores = getTeamGameScores(sessionScores);
    const wScores = getWeightedGameScores(sessionScores);
    const dScores = getTeamDominance(sessionScores);
    sessionScores.forEach(({ name }) => {
      // Only update stats for players who played in this game
      placements[name].push(placeMap[name]);
      scores[name].gamesPlayed += 1;
      if (gScores[name] !== undefined) gameScoresArr[name].push(gScores[name]);
      if (wScores[name] !== undefined) weightedGameScoresArr[name].push(wScores[name]);
      if (dScores[name] !== undefined) dominanceArr[name].push(dScores[name]);
    });
    // Only count a win for players who played
    const max = Math.max(...sessionScores.map(s => s.score));
    sessionScores.forEach(({ name, score }) => {
      if (score === max) scores[name].wins += 1;
    });
  });

  return Object.entries(scores)
    .map(([name, stats]) => ({
      name,
      ...stats,
      avgPlacement:
        placements[name].length > 0
          ? (
              placements[name].reduce((a, b) => a + b, 0) /
              placements[name].length
            ).toFixed(2)
          : "—",
      avgGameScore:
        gameScoresArr[name].length > 0
          ? (
              gameScoresArr[name].reduce((a, b) => a + b, 0) /
              gameScoresArr[name].length
            ).toFixed(1)
          : "—",
      avgWeightedGameScore:
        weightedGameScoresArr[name].length > 0
          ? (
              weightedGameScoresArr[name].reduce((a, b) => a + b, 0) /
              weightedGameScoresArr[name].length
            ).toFixed(2)
          : "—",
      avgDominance:
        dominanceArr[name].length > 0
          ? (
              dominanceArr[name].reduce((a, b) => a + b, 0) /
              dominanceArr[name].length
            ).toFixed(2)
          : "—",
    }))
    .sort((a, b) => b.wins - a.wins || a.avgPlacement - b.avgPlacement);
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  // Format as MM/DD/YYYY hh:mm AM/PM
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yyyy = date.getFullYear();
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  return `${mm}/${dd}/${yyyy} ${hours}:${minutes} ${ampm}`;
}

export default function ScoreTracker() {
  const defaultPlayers = ["Kyle", "Tom", "Sean", "Brian"];
  const [players, setPlayers] = useState(defaultPlayers);
  const [newPlayer, setNewPlayer] = useState("");
  const [gameSessions, setGameSessions] = useState([]);
  const [sessionScores, setSessionScores] = useState([]);
  const [addingGame, setAddingGame] = useState(false);
  const [gameName, setGameName] = useState("");

  const [selectedGame, setSelectedGame] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [editingGameIdx, setEditingGameIdx] = useState(null);
  const [editingScores, setEditingScores] = useState([]);
  const [editingGameName, setEditingGameName] = useState("");

  const addPlayer = () => {
    if (newPlayer && !players.includes(newPlayer)) {
      setPlayers([...players, newPlayer]);
      setNewPlayer("");
    }
  };

  const startNewGame = () => {
    setSessionScores(players.map(name => ({ name, score: 0, active: true })));
    setAddingGame(true);
    setGameName("");
  };


  const updateScore = (idx, val) => {
    setSessionScores(sessionScores.map((s, i) =>
      i === idx ? { ...s, score: parseInt(val) || 0 } : s
    ));
  };

const submitScores = () => {
  if (!gameName.trim()) return;

  // Filter for active players
  let activeScores = sessionScores.filter(s => s.active);
  let savedScores;
  let teamMeta = null;

  if (isTeamGame) {
    // Assign teams to players
    teamMeta = {};
    activeScores.forEach((s, i) => {
      // Map player to team using teamAssignments (by sessionScores index)
      const originalIdx = sessionScores.findIndex(ss => ss.name === s.name);
      const teamId = teamAssignments[originalIdx] || 1;
      if (!teamMeta[teamId]) teamMeta[teamId] = [];
      teamMeta[teamId].push(s);
    });
    // Assign same score to all teammates (enforce in UI)
    savedScores = [];
    Object.entries(teamMeta).forEach(([teamId, teamPlayers]) => {
      // Use the first teammate's score for the whole team
      const score = teamPlayers[0].score;
      teamPlayers.forEach(player => {
        savedScores.push({
          ...player,
          team: Number(teamId),
          score,
        });
      });
    });
  } else {
    savedScores = activeScores.map(s => ({ ...s }));
  }
  setGameSessions([
    ...gameSessions,
    {
      scores: savedScores,
      gameName: gameName.trim(),
      enteredAt: new Date().toISOString(),
      isTeamGame: isTeamGame,
      teamAssignments: isTeamGame ? teamAssignments : null
    }
  ]);

  setSessionScores([]);
  setTeamAssignments([]);
  setIsTeamGame(false);
  setAddingGame(false);
  setGameName("");
};

  const startEditGame = idx => {
    setEditingGameIdx(idx);
    setEditingScores([...gameSessions[idx].scores]);
    setEditingGameName(gameSessions[idx].gameName || "");
    setSelectedGame(null);
  };
  const editGameScore = (idx, val) => {
    setEditingScores(editingScores.map((s, i) =>
      i === idx ? { ...s, score: parseInt(val) || 0 } : s
    ));
  };
  const saveEditGame = () => {
    const updated = [...gameSessions];
    updated[editingGameIdx] = {
      ...updated[editingGameIdx],
      scores: editingScores.filter(s => typeof s.score === "number" && !isNaN(s.score)),
      gameName: editingGameName.trim() || updated[editingGameIdx].gameName
    };
    setGameSessions(updated);
    setEditingGameIdx(null);
    setEditingScores([]);
    setEditingGameName("");
  };

  function getTeamPlacements(scoresArr) {
    // If no "team" property, fallback to regular placements
    if (!scoresArr.some(s => s.team)) return getPlacements(scoresArr);
  
    // Group by team
    const teams = {};
    scoresArr.forEach(s => {
      if (!teams[s.team]) teams[s.team] = [];
      teams[s.team].push(s);
    });
    // Each team's score is the score of one member (all must be equal)
    const teamList = Object.entries(teams).map(([team, players]) => ({
      team,
      score: players[0].score,
      names: players.map(p => p.name)
    }));
    // Sort by score
    teamList.sort((a, b) => b.score - a.score);
  
    // Calculate placements with ties
    let placements = {};
    let place = 1;
    let prevScore = null;
    let samePlaceCount = 0;
    for (let i = 0; i < teamList.length; i++) {
      const t = teamList[i];
      if (prevScore !== null && t.score === prevScore) {
        samePlaceCount++;
      } else {
        place = i + 1;
        samePlaceCount = 1;
      }
      t.names.forEach(n => placements[n] = place);
      prevScore = t.score;
    }
    return placements;
  }
  
  function getTeamDominance(scoresArr) {
    // If no "team" property, fallback to regular dominance
    if (!scoresArr.some(s => s.team)) return getGameDominance(scoresArr);
  
    // Group by team
    const teams = {};
    scoresArr.forEach(s => {
      if (!teams[s.team]) teams[s.team] = [];
      teams[s.team].push(s);
    });
    const teamScores = Object.values(teams).map(team => team[0].score);
    const total = teamScores.reduce((a, b) => a + b, 0);
    let teamDominance = {};
    Object.entries(teams).forEach(([teamId, teamPlayers]) => {
      const dom = total === 0 ? 0 : Number(((teamPlayers[0].score / total) * 100).toFixed(2));
      teamPlayers.forEach(p => {
        teamDominance[p.name] = dom;
      });
    });
    return teamDominance;
  }
  
  const leaderboard = getLeaderboard(gameSessions, players);

  function playerGames(player) {
    return gameSessions
      .map((g) => {
        const entry = g.scores.find(s => s.name === player);
        if (!entry) return null;
        const placeMap = getTeamPlacements(g.scores);
        const place = placeMap[player];
        const maxScore = Math.max(...g.scores.map(s => s.score));
        const isWin = entry.score === maxScore;
        return {
          gameName: g.gameName,
          enteredAt: g.enteredAt,
          score: entry.score,
          placement: place,
          isWin
        };
      })
      .filter(Boolean);
  }

  const focusRing = "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2";
  const btn =
    "px-4 py-2 rounded-full font-semibold shadow-sm transition bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 " +
    focusRing;
  const btnAlt =
    "px-3 py-1 rounded-full font-semibold transition bg-gray-200 text-gray-900 hover:bg-gray-300 " + focusRing;

  const fileInputRef = React.useRef();
    const handleSaveLog = () => {
    const logData = JSON.stringify(gameSessions, null, 2);
    const blob = new Blob([logData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "boardgame-log.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleLoadLog = event => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const loaded = JSON.parse(e.target.result);
        // Accept ONLY the latest format: an array of games, each with scores, gameName, and enteredAt
        if (
          Array.isArray(loaded) &&
          loaded.length > 0 &&
          loaded.every(
            g =>
              typeof g.gameName === "string" &&
              typeof g.enteredAt === "string" &&
              Array.isArray(g.scores) &&
              g.scores.every(
                s =>
                  typeof s.name === "string" &&
                  typeof s.score === "number"
              )
          )
        ) {
          setGameSessions(loaded);
          // Update players list based on loaded data
          const allPlayers = new Set();
          loaded.forEach(gs => gs.scores.forEach(s => allPlayers.add(s.name)));
          setPlayers(Array.from(allPlayers));
        } else {
          alert("Invalid log file. Please select a log exported from this app.");
        }
      } catch {
        alert("Could not load file. Is it valid JSON?");
      }
    };
    reader.readAsText(file);
  }

  const [isTeamGame, setIsTeamGame] = useState(false);
  // teamAssignments: array of team ids, same order as sessionScores, e.g. [1, 2, 1, 2]
  const [teamAssignments, setTeamAssignments] = useState([]);


  const [leaderboardSort, setLeaderboardSort] = useState({ col: "wins", dir: "desc" });
  function sortLeaderboard(arr) {
    const { col, dir } = leaderboardSort;
    const sorted = [...arr].sort((a, b) => {
      let av = a[col], bv = b[col];
      // If string, compare lexically, else numerically
      if (!isNaN(Number(av)) && !isNaN(Number(bv))) {
        av = Number(av); bv = Number(bv);
      }
      if (av < bv) return dir === "asc" ? -1 : 1;
      if (av > bv) return dir === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  };


  return (
    <div className="bg-neutral-50 min-h-screen flex items-center justify-center py-10">
      <div className="w-full max-w-2xl rounded-3xl shadow-2xl bg-white p-6">
        <h1 className="text-3xl font-bold mb-3 text-blue-700 tracking-tight">
          Board Game Score Tracker
        </h1>

        {/* Player management */}
        {!selectedGame && !selectedPlayer && editingGameIdx === null && (
          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2 text-gray-900">Players</h2>
            <div className="flex gap-2 mb-3">
              <input
                className={"border-2 border-gray-300 rounded-xl px-3 py-2 flex-1 text-base " + focusRing}
                placeholder="Add player"
                value={newPlayer}
                onChange={e => setNewPlayer(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addPlayer()}
                aria-label="Add player"
              />
              <button
                className={btn}
                onClick={addPlayer}
                disabled={!newPlayer.trim() || players.includes(newPlayer)}
                aria-label="Add Player"
              >
                Add
              </button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {players.map(name => (
                <button
                  key={name}
                  className="bg-blue-50 hover:bg-blue-100 rounded-xl px-4 py-1 text-sm font-medium text-blue-800 transition border border-blue-200 cursor-pointer"
                  onClick={() => setSelectedPlayer(name)}
                  title={`See log for ${name}`}
                  tabIndex={0}
                  type="button"
                >
                  {name}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* New Game Entry */}
        {!selectedGame && !selectedPlayer && editingGameIdx === null && (
          <div className="mb-6">
            <button
              className={btn + " text-lg"}
              onClick={startNewGame}
              disabled={players.length < 2 || addingGame}
            >
              Record Game
            </button>
                <button
                  className={btnAlt + " ml-2"}
                  onClick={handleSaveLog}
                >
                  Save Log
                </button>
                <button
                  className={btnAlt + " ml-2"}
                  onClick={() => fileInputRef.current.click()}
                >
                  Load Log
                </button>
                <input
                  type="file"
                  accept="application/json"
                  style={{ display: "none" }}
                  ref={fileInputRef}
                  onChange={handleLoadLog}
                />
          </div>
        )}

        {/* Enter Scores */}
        {addingGame && (
          <section className="mb-8 rounded-2xl shadow bg-neutral-100 p-6">
            <h2 className="text-lg font-semibold mb-3 text-blue-900">Record Game Scores</h2>
            <input
              className={"border-2 border-blue-300 rounded-xl px-3 py-2 w-full mb-4 text-base " + focusRing}
              placeholder="Game name (required)"
              value={gameName}
              onChange={e => setGameName(e.target.value)}
              maxLength={64}
              autoFocus
            />
            <div className="mb-4 flex items-center gap-2">
              <input
                type="checkbox"
                checked={isTeamGame}
                onChange={e => {
                  setIsTeamGame(e.target.checked);
                  // If enabling team game, default to team 1 for all; otherwise, clear teams
                  setTeamAssignments(sessionScores.map(() => 1));
                }}
                id="team-game-checkbox"
              />
              <label htmlFor="team-game-checkbox" className="text-base">Team game?</label>
            </div>
            {sessionScores.map((p, i) => (
              <div className="flex items-center gap-2 mb-3" key={p.name}>
              <input
                type="checkbox"
                checked={p.active}
                onChange={e =>
                  setSessionScores(sessionScores.map((s, j) =>
                    i === j ? { ...s, active: e.target.checked } : s
                  ))
                }
                aria-label={`Participated: ${p.name}`}
              />
              <span className="flex-1 text-base">{p.name}</span>
              {isTeamGame && (
                <select
                  className="border border-gray-300 rounded px-2 py-1 mr-2"
                  value={teamAssignments[i] || 1}
                  onChange={e => {
                    const arr = [...teamAssignments];
                    arr[i] = Number(e.target.value);
                    setTeamAssignments(arr);
                  }}
                  disabled={!p.active}
                >
                  {[1,2,3,4,5,6].map(teamNum =>
                    <option value={teamNum} key={teamNum}>Team {teamNum}</option>
                  )}
                </select>
              )}

              <input
                type="number"
                className={"border-2 border-gray-300 rounded-xl px-3 py-2 w-24 text-base text-right " + focusRing}
                value={p.score}
                onChange={e => updateScore(i, e.target.value)}
                aria-label={`Score for ${p.name}`}
                disabled={!p.active}
              />
              </div>
            ))}

            <button
              className={btn + " mt-3"}
              onClick={submitScores}
              disabled={!gameName.trim()}
            >
              Save Game
            </button>
          </section>
        )}

        {/* Leaderboard */}
        {!selectedGame && !selectedPlayer && editingGameIdx === null && (
          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-900">Leaderboard</h2>
            {leaderboard.length === 0 ? (
              <div className="text-gray-500">No games played yet.</div>
            ) : (
              <div className="overflow-x-auto rounded-xl shadow border">
                <table className="w-full text-left">
                  <thead className="bg-blue-50">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Player</th>
                      <th
                        className="px-3 py-2 cursor-pointer select-none"
                        onClick={() =>
                          setLeaderboardSort(s =>
                            s.col === "wins"
                              ? { col: "wins", dir: s.dir === "asc" ? "desc" : "asc" }
                              : { col: "wins", dir: "desc" }
                          )
                        }
                      >
                        Wins{" "}
                        {leaderboardSort.col === "wins" && (leaderboardSort.dir === "asc" ? "▲" : "▼")}
                      </th>
                      <th
                        className="px-3 py-2 cursor-pointer select-none"
                        onClick={() =>
                          setLeaderboardSort(s =>
                            s.col === "avgPlacement"
                              ? { col: "avgPlacement", dir: s.dir === "asc" ? "desc" : "asc" }
                              : { col: "avgPlacement", dir: "asc" }
                          )
                        }
                      >
                        Avg Placement{" "}
                        {leaderboardSort.col === "avgPlacement" &&
                          (leaderboardSort.dir === "asc" ? "▲" : "▼")}
                      </th>
                      <th
                        className="px-3 py-2 cursor-pointer select-none"
                        onClick={() =>
                          setLeaderboardSort(s =>
                            s.col === "avgGameScore"
                              ? { col: "avgGameScore", dir: s.dir === "asc" ? "desc" : "asc" }
                              : { col: "avgGameScore", dir: "desc" }
                          )
                        }
                      >
                        Avg Game Score{" "}
                        {leaderboardSort.col === "avgGameScore" &&
                          (leaderboardSort.dir === "asc" ? "▲" : "▼")}
                      </th>
                      <th
                        className="px-3 py-2 cursor-pointer select-none"
                        onClick={() =>
                          setLeaderboardSort(s =>
                            s.col === "avgWeightedGameScore"
                              ? { col: "avgWeightedGameScore", dir: s.dir === "asc" ? "desc" : "asc" }
                              : { col: "avgWeightedGameScore", dir: "desc" }
                          )
                        }
                      >
                        Avg Weighted Game Score{" "}
                        {leaderboardSort.col === "avgWeightedGameScore" &&
                          (leaderboardSort.dir === "asc" ? "▲" : "▼")}
                      </th>

                      <th
                        className="px-3 py-2 cursor-pointer select-none"
                        onClick={() =>
                          setLeaderboardSort(s =>
                            s.col === "avgDominance"
                              ? { col: "avgDominance", dir: s.dir === "asc" ? "desc" : "asc" }
                              : { col: "avgDominance", dir: "desc" }
                          )
                        }
                      >
                        Avg Game Dominance{" "}
                        {leaderboardSort.col === "avgDominance" &&
                          (leaderboardSort.dir === "asc" ? "▲" : "▼")}
                      </th>
                      <th
                        className="px-3 py-2 cursor-pointer select-none"
                        onClick={() =>
                          setLeaderboardSort(s =>
                            s.col === "gamesPlayed"
                              ? { col: "gamesPlayed", dir: s.dir === "asc" ? "desc" : "asc" }
                              : { col: "gamesPlayed", dir: "desc" }
                          )
                        }
                      >
                        Games Played{" "}
                        {leaderboardSort.col === "gamesPlayed" &&
                          (leaderboardSort.dir === "asc" ? "▲" : "▼")}
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {sortLeaderboard(leaderboard).map((p, i) => (
                      <tr key={p.name} className={i % 2 ? "bg-white" : "bg-blue-50"}>
                        <td className="px-3 py-2">{i + 1}</td>
                        <td>
                          <button
                            className="underline text-blue-700 hover:text-blue-900"
                            onClick={() => setSelectedPlayer(p.name)}
                            title={`See log for ${p.name}`}
                          >
                            {p.name}
                          </button>
                        </td>
                        <td className="px-3 py-2">{p.wins}</td>
                        <td className="px-3 py-2">{p.avgPlacement}</td>
                        <td className="px-3 py-2">{p.avgGameScore}</td>
                        <td className="px-3 py-2">{p.avgWeightedGameScore}</td>
                        <td className="px-3 py-2">{p.avgDominance}</td>
                        <td className="px-3 py-2">{p.gamesPlayed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Game log */}
            {gameSessions.length > 0 && (
              <div className="mt-8">
                <h3 className="font-semibold mb-2 text-blue-800">Game Log</h3>
                <div className="overflow-x-auto rounded-xl shadow border">
                  <table className="w-full text-left">
                    <thead className="bg-neutral-100">
                      <tr>
                        <th className="px-3 py-2">Game Name</th>
                        <th className="px-3 py-2">When</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {gameSessions.map((gs, idx) => (
                        <tr key={idx} className={idx % 2 ? "bg-neutral-50" : "bg-white"}>
                          <td className="px-3 py-2">{gs.gameName}</td>
                          <td className="px-3 py-2">{gs.enteredAt ? formatDate(gs.enteredAt) : ""}</td>
                          <td className="px-3 py-2">
                            <button
                              className="text-xs text-blue-700 underline"
                              onClick={() => setSelectedGame(idx)}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Game Log (Details) */}
        {selectedGame !== null && (
          <section className="mb-6 rounded-2xl shadow bg-neutral-100 p-6">
            <h2 className="text-xl font-semibold mb-2 text-blue-900">
              {gameSessions[selectedGame].gameName}
            </h2>
            <div className="text-xs text-gray-600 mb-3">
              {gameSessions[selectedGame].enteredAt ? formatDate(gameSessions[selectedGame].enteredAt) : ""}
            </div>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-left">
                <thead className="bg-blue-50">
                    <tr>
                        <th className="px-3 py-2">Player</th>
                        {gameSessions[selectedGame]?.isTeamGame && (
                        <th className="px-3 py-2">Team</th>
                        )}
                        <th className="px-3 py-2">Score</th>
                        <th className="px-3 py-2">Placement</th>
                        <th className="px-3 py-2">Game Score</th>
                        <th className="px-3 py-2">Weighted Game Score</th>
                        <th className="px-3 py-2">Game Dominance</th>
                        <th className="px-3 py-2">Winner?</th>
                    </tr>
                </thead>
                <tbody>
                    {(() => {
                        const scoreArr = [...gameSessions[selectedGame].scores].sort((a, b) => b.score - a.score);
                        const placeMap = getTeamPlacements(scoreArr);
                        const gameScores = getTeamGameScores(scoreArr);
                        const weightedScores = getWeightedGameScores(scoreArr);
                        const dominanceScores = getTeamDominance(scoreArr);
                        const maxScore = scoreArr.length ? scoreArr[0].score : null;
                        return scoreArr.map((s, idx) => {
                        const place = placeMap[s.name];
                        const isWin = s.score === maxScore;
                        return (
                            <tr key={s.name} className={idx % 2 ? "bg-white" : "bg-blue-50"}>
                            <td className="px-3 py-2">{s.name}</td>
                            {gameSessions[selectedGame]?.isTeamGame && (
                                <td className="px-3 py-2">{s.team ?? ""}</td>
                            )}
                            <td className="px-3 py-2">{s.score}</td>
                            <td className="px-3 py-2">{place}</td>
                            <td className="px-3 py-2">{gameScores[s.name]}</td>
                            <td className="px-3 py-2">{weightedScores[s.name]}</td>
                            <td className="px-3 py-2">{dominanceScores[s.name]}%</td>
                            <td className="px-3 py-2">{isWin ? "🏆" : ""}</td>
                            </tr>
                        );
                        });
                    })()}
                  </tbody>
              </table>
            </div>
            <div className="mt-4 flex gap-2">
              <button className={btnAlt} onClick={() => setSelectedGame(null)}>
                Back
              </button>
              <button className={btn} onClick={() => startEditGame(selectedGame)}>
                Edit This Game
              </button>
            </div>
          </section>
        )}

        {/* Player Log */}
        {selectedPlayer && (
          <section className="mb-6 rounded-2xl shadow bg-neutral-100 p-6">
            <h2 className="text-xl font-semibold mb-2 text-blue-900">
              {selectedPlayer} — Game Log
            </h2>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-left">
                <thead className="bg-blue-50">
                    <tr>
                        <th className="px-3 py-2">Game Name</th>
                        <th className="px-3 py-2">When</th>
                        {/** Team column */}
                        <th className="px-3 py-2">Team</th>
                        <th className="px-3 py-2">Score</th>
                        <th className="px-3 py-2">Placement</th>
                        <th className="px-3 py-2">Game Score</th>
                        <th className="px-3 py-2">Weighted Game Score</th>
                        <th className="px-3 py-2">Game Dominance</th>
                        <th className="px-3 py-2">Winner?</th>
                    </tr>
                  </thead>
                <tbody>
                  {playerGames(selectedPlayer).map((g, idx) => {
                    // Find the full scores for this game so we can get Game Score
                    const session = gameSessions.find(sess => sess.gameName === g.gameName && sess.enteredAt === g.enteredAt);
                    const scoresArr = session ? session.scores : [];
                    const gameScores = getTeamGameScores(scoresArr);
                    const weightedScores = getWeightedGameScores(scoresArr);
                    return (
                      <tr key={g.gameName + g.enteredAt} className={idx % 2 ? "bg-white" : "bg-blue-50"}>
                        <td className="px-3 py-2">{g.gameName}</td>
                        <td className="px-3 py-2">{g.enteredAt ? formatDate(g.enteredAt) : ""}</td>
                        <td className="px-3 py-2">
                          {session && session.isTeamGame && (
                          (() => {
                              const playerEntry = session.scores.find(s => s.name === selectedPlayer);
                              return playerEntry && playerEntry.team ? playerEntry.team : "";
                          })()
                          )}
                        </td>
                        <td className="px-3 py-2">{g.score}</td>
                        <td className="px-3 py-2">{g.placement}</td>
                        <td className="px-3 py-2">{gameScores && gameScores[g && g.name ? g.name : selectedPlayer]}</td>
                        <td className="px-3 py-2">{weightedScores && weightedScores[g && g.name ? g.name : selectedPlayer]}</td>
                        <td className="px-3 py-2">
                          {(() => {
                            if (!session) return "";
                            const doms = getTeamDominance(scoresArr);
                            return doms && doms[selectedPlayer] !== undefined ? doms[selectedPlayer] + "%" : "";
                          })()}
                        </td>
                        <td className="px-3 py-2">{g.isWin ? "🏆" : ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <button className={btnAlt + " mt-4"} onClick={() => setSelectedPlayer(null)}>
              Back
            </button>
          </section>
        )}

        {/* Edit Game */}
        {editingGameIdx !== null && (
          <section className="mb-6 rounded-2xl shadow bg-neutral-100 p-6">
            <h2 className="text-xl font-semibold mb-2 text-blue-900">
              Edit {editingGameName || "Game"}
            </h2>
            <input
              className="border-2 border-blue-300 rounded-xl px-3 py-2 w-full mb-4 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              placeholder="Game name"
              value={editingGameName}
              onChange={e => setEditingGameName(e.target.value)}
              maxLength={64}
              autoFocus
            />
            {editingScores.map((p, i) => (
              <div className="flex items-center gap-2 mb-3" key={p.name}>
                <span className="flex-1 text-base">{p.name}</span>
                <input
                  type="number"
                  className="border-2 border-gray-300 rounded-xl px-3 py-2 w-24 text-base text-right focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  value={p.score}
                  onChange={e => editGameScore(i, e.target.value)}
                  aria-label={`Score for ${p.name}`}
                />
              </div>
            ))}
            <div className="mt-4 flex gap-2">
              <button
                className="px-4 py-2 rounded-full font-semibold shadow-sm transition bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                onClick={saveEditGame}
                disabled={!editingGameName.trim()}
              >
                Save
              </button>
              <button
                className="px-3 py-1 rounded-full font-semibold transition bg-gray-200 text-gray-900 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                onClick={() => setEditingGameIdx(null)}
              >
                Cancel
              </button>
            </div>
          </section>
        )}
        
      </div>
    </div>
  );
}
