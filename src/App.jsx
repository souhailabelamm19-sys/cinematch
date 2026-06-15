import { useState, useEffect } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:3001");
const API_KEY = "db7de376a3954cc4908f9f703e8f19bc";
const API_URL = "https://api.themoviedb.org/3";

function generateRoomId() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

export default function App() {
  const [screen, setScreen] = useState("home");
  const [roomId, setRoomId] = useState("");
  const [inputRoom, setInputRoom] = useState("");
  const [users, setUsers] = useState(0);
  const [movies, setMovies] = useState([]);
  const [current, setCurrent] = useState(0);
  const [myLikes, setMyLikes] = useState([]);
  const [match, setMatch] = useState(null);
  const [animate, setAnimate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/movie/popular?api_key=${API_KEY}&language=fr-FR&page=1`)
      .then((res) => res.json())
      .then((data) => { setMovies(data.results.slice(0, 10)); setLoading(false); });

    socket.on("room-joined", ({ roomId, users }) => {
      setRoomId(roomId);
      setUsers(users);
      setScreen("swipe");
    });

    socket.on("match", ({ movieId }) => {
      const movie = movies.find((m, i) => i === movieId);
      if (movie) setMatch(movie);
    });

    return () => { socket.off("room-joined"); socket.off("match"); };
  }, [movies]);

  function createRoom() {
    const id = generateRoomId();
    socket.emit("join-room", id);
  }

  function joinRoom() {
    if (inputRoom.trim()) socket.emit("join-room", inputRoom.toUpperCase());
  }

  function swipe(dir) {
    if (animate || current >= movies.length) return;
    setAnimate(dir);
    socket.emit("swipe", { roomId, movieId: current, dir });
    setTimeout(() => {
      if (dir === "like") setMyLikes((l) => [...l, current]);
      setCurrent((c) => c + 1);
      setAnimate(null);
    }, 300);
  }

  if (screen === "home") return (
    <div style={{ maxWidth: 400, margin: "0 auto", padding: "2rem 1rem", fontFamily: "sans-serif", textAlign: "center" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 8px" }}>🎬 CinéMatch</h1>
      <p style={{ color: "#888", marginBottom: 40 }}>Trouvez un film à regarder ensemble</p>

      <button onClick={createRoom} style={{ width: "100%", padding: 14, background: "#7c3aed", color: "#fff", border: "none", borderRadius: 12, fontSize: 16, cursor: "pointer", marginBottom: 16 }}>
        Créer une salle
      </button>

      <p style={{ color: "#888", marginBottom: 12 }}>ou rejoindre une salle existante</p>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={inputRoom}
          onChange={(e) => setInputRoom(e.target.value)}
          placeholder="Code de la salle (ex: A8F2)"
          style={{ flex: 1, padding: 12, borderRadius: 10, border: "1px solid #ddd", fontSize: 14 }}
        />
        <button onClick={joinRoom} style={{ padding: "12px 16px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, cursor: "pointer" }}>
          Rejoindre
        </button>
      </div>
    </div>
  );

  const movie = movies[current];
  const progress = Math.round((current / movies.length) * 100);

  return (
    <div style={{ maxWidth: 400, margin: "0 auto", padding: "1rem", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>🎬 CinéMatch</h1>
        <span style={{ background: "#f3f0ff", color: "#7c3aed", padding: "4px 12px", borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
          Salle #{roomId} · {users} 👤
        </span>
      </div>

      <div style={{ background: "#f0f0f0", borderRadius: 20, height: 6, marginBottom: 8 }}>
        <div style={{ background: "#7c3aed", height: 6, borderRadius: 20, width: progress + "%" }} />
      </div>
      <p style={{ fontSize: 12, color: "#888", textAlign: "center", marginBottom: 16 }}>{current} / {movies.length} films</p>

      {loading ? (
        <p style={{ textAlign: "center", color: "#888" }}>Chargement...</p>
      ) : current < movies.length ? (
        <div style={{
          background: "#fff", borderRadius: 16, border: "1px solid #eee",
          overflow: "hidden", marginBottom: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          transform: animate === "like" ? "rotate(5deg) translateX(40px)" : animate === "pass" ? "rotate(-5deg) translateX(-40px)" : "none",
          opacity: animate ? 0 : 1, transition: "all 0.3s ease"
        }}>
          <img src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`} alt={movie.title} style={{ width: "100%", height: 300, objectFit: "cover" }} />
          <div style={{ padding: "1rem" }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 4px" }}>{movie.title}</h2>
            <p style={{ color: "#888", fontSize: 12, margin: "0 0 8px" }}>{movie.release_date?.slice(0, 4)} · ⭐ {movie.vote_average?.toFixed(1)}</p>
            <p style={{ color: "#555", fontSize: 14, lineHeight: 1.5, margin: 0 }}>{movie.overview?.slice(0, 120)}...</p>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
          <div style={{ fontSize: 60 }}>🏁</div>
          <p style={{ color: "#888", marginTop: 12 }}>Vous avez vu tous les films !</p>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "center", gap: 24 }}>
        <button onClick={() => swipe("pass")} style={{ width: 60, height: 60, borderRadius: "50%", border: "1px solid #eee", background: "#fff", fontSize: 26, cursor: "pointer" }}>❌</button>
        <button onClick={() => swipe("like")} style={{ width: 60, height: 60, borderRadius: "50%", border: "1px solid #eee", background: "#fff", fontSize: 26, cursor: "pointer" }}>❤️</button>
      </div>

      {match && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "2rem", textAlign: "center", maxWidth: 280, width: "90%" }}>
            <div style={{ fontSize: 48 }}>🎉</div>
            <h2 style={{ fontSize: 22, margin: "12px 0 4px" }}>C'est un match !</h2>
            <img src={`https://image.tmdb.org/t/p/w200${match.poster_path}`} alt={match.title} style={{ width: 80, borderRadius: 8, margin: "8px 0" }} />
            <p style={{ color: "#7c3aed", fontWeight: 600, fontSize: 16 }}>{match.title}</p>
            <p style={{ color: "#888", fontSize: 13, margin: "8px 0 20px" }}>Vous aimez tous les deux ce film !</p>
            <button onClick={() => setMatch(null)} style={{ width: "100%", padding: 12, background: "#7c3aed", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, cursor: "pointer" }}>
              Continuer à swiper
            </button>
          </div>
        </div>
      )}
    </div>
  );
}