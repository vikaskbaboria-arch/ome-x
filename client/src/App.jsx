import { useEffect, useRef, useState } from "react";
import {
  ArrowDownLeft,
  ArrowRight,
  Camera,
  Check,
  ChevronRight,
  CircleHelp,
  Compass,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Mic,
  MicOff,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  Video,
  VideoOff,
  X,
} from "lucide-react";
import { useVideoMatch } from "./hooks/useVideoMatch.js";
import { apiRequest, clearSession, readSession, refreshSession, saveSession } from "./lib/api.js";

function ThemeButton({ theme, onToggle }) {
  const isDark = theme === "dark";
  return (
    <button className="theme-button" type="button" onClick={onToggle} aria-label={`Switch to ${isDark ? "light" : "dark"} mode`} title={`Switch to ${isDark ? "light" : "dark"} mode`}>
      {isDark ? <Sun size={17} /> : <Moon size={17} />}
      <span>{isDark ? "Light" : "Dark"}</span>
    </button>
  );
}

function Brand({ compact = false }) {
  return (
    <a className={`brand ${compact ? "brand-compact" : ""}`} href="#top" aria-label="Orbit home">
      <span className="brand-mark"><Compass size={19} strokeWidth={2.2} /></span>
      <span>orbit<span className="brand-period">.</span></span>
    </a>
  );
}

function AuthScreen({ theme, onToggleTheme, onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", username: "", identity: "", email: "", password: "" });
  const isRegister = mode === "register";

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (isRegister) {
        await apiRequest("/users/register", {
          method: "POST",
          body: { name: form.name.trim(), username: form.username.trim(), email: form.email.trim(), password: form.password },
        });
      }
      const identity = isRegister ? form.email.trim() : form.identity.trim();
      const loginResponse = await apiRequest("/users/login", {
        method: "POST",
        body: {
          ...(identity.includes("@") ? { email: identity.toLowerCase() } : { username: identity.toLowerCase() }),
          password: form.password,
        },
      });
      const session = {
        user: loginResponse.data.user,
        accessToken: loginResponse.data.accessToken,
        refreshToken: loginResponse.data.refreshToken,
      };
      saveSession(session);
      onAuthenticated(session);
    } catch (requestError) {
      setError(requestError.message || "We couldn’t sign you in. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`app-shell theme-${theme}`} id="top">
      <div className="auth-page">
        <header className="topbar auth-topbar">
          <Brand />
          <div className="topbar-actions"><span className="topbar-note"><LockKeyhole size={14} /> A quieter corner of the internet</span><ThemeButton theme={theme} onToggle={onToggleTheme} /></div>
        </header>
        <main className="auth-layout">
          <section className="welcome-copy">
            <div className="eyebrow"><span className="eyebrow-dot" /> VIDEO, WITHOUT THE NOISE</div>
            <h1>Make a little<br /><span>room for</span> surprise.</h1>
            <p className="welcome-lede">A simple way to meet someone new, face to face. No feed to scroll. Just a conversation waiting to happen.</p>
            <div className="welcome-points">
              <div><span className="point-icon"><Video size={18} /></span><span><strong>Video first</strong><small>One click takes you into a live conversation.</small></span></div>
              <div><span className="point-icon point-icon-peach"><ShieldCheck size={18} /></span><span><strong>You’re in control</strong><small>Skip ahead or leave whenever you like.</small></span></div>
            </div>
            <div className="soft-orbit orbit-one" /><div className="soft-orbit orbit-two" />
          </section>

          <section className="auth-card" aria-label={isRegister ? "Create account" : "Sign in"}>
            <div className="auth-card-heading">
              <span className="auth-spark"><Sparkles size={17} /></span>
              <div><div className="overline">YOUR NEXT HELLO IS CLOSE</div><h2>{isRegister ? "Create your account" : "Welcome back"}</h2></div>
            </div>
            <p className="auth-subtitle">{isRegister ? "A few details and you’re ready to meet." : "Sign in to step back into the conversation."}</p>
            <form className="auth-form" onSubmit={submit}>
              {isRegister ? (
                <>
                  <label>Your name<input autoComplete="name" value={form.name} onChange={update("name")} placeholder="Alex Morgan" required maxLength={60} /></label>
                  <label>Username<input autoComplete="username" value={form.username} onChange={update("username")} placeholder="alexmorgan" required minLength={3} maxLength={30} /></label>
                  <label>Email address<input type="email" autoComplete="email" value={form.email} onChange={update("email")} placeholder="you@example.com" required /></label>
                </>
              ) : (
                <label>Email or username<input autoComplete="username" value={form.identity} onChange={update("identity")} placeholder="you@example.com" required /></label>
              )}
              <label>Password<input type="password" autoComplete={isRegister ? "new-password" : "current-password"} value={form.password} onChange={update("password")} placeholder="At least 8 characters" required minLength={isRegister ? 8 : 1} /></label>
              {error && <div className="form-error" role="alert"><CircleHelp size={16} />{error}</div>}
              <button className="button button-primary auth-submit" type="submit" disabled={busy}>
                {busy ? <LoaderCircle className="spin" size={18} /> : <>{isRegister ? "Create account" : "Sign in"}<ArrowRight size={17} /></>}
              </button>
            </form>
            <div className="auth-switch">{isRegister ? "Already have an account?" : "New to Orbit?"} <button type="button" onClick={() => { setMode(isRegister ? "login" : "register"); setError(""); }}> {isRegister ? "Sign in" : "Create an account"}</button></div>
            <div className="auth-footnote"><LockKeyhole size={13} /> Your account keeps your sign-in secure.</div>
          </section>
        </main>
        <footer className="page-footer"><span>© 2026 Orbit</span><span>A little more human, one hello at a time.</span></footer>
      </div>
    </div>
  );
}

function StatusLabel({ status }) {
  const labels = {
    idle: "Ready when you are",
    requesting: "Turning on your camera",
    searching: "Finding someone for you",
    connecting: "Making the connection",
    connected: "You’re connected",
    error: "Needs your attention",
  };
  const isActive = ["requesting", "searching", "connecting"].includes(status);
  return <span className={`status-label status-${status}`}><span className={isActive ? "status-pulse" : "status-dot"} />{labels[status] || labels.idle}</span>;
}

function VideoHome({ session, theme, onToggleTheme, onLogout }) {
  const video = useVideoMatch(session.accessToken);
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const isActive = video.status !== "idle";
  const isBusy = ["requesting", "searching", "connecting"].includes(video.status);

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = video.remoteStream || null;
  }, [video.remoteStream]);
  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = video.localStream || null;
  }, [video.localStream]);

  const username = session.user?.username || session.user?.email?.split("@")[0] || "friend";
  const displayName = session.user?.name || username;

  return (
    <div className={`app-shell theme-${theme}`} id="top">
      <div className="home-page">
        <header className="topbar home-topbar">
          <Brand compact />
          <div className="topbar-actions"><div className="user-chip"><span className="user-avatar">{username.slice(0, 1).toUpperCase()}</span><span className="user-name">{displayName}</span></div><ThemeButton theme={theme} onToggle={onToggleTheme} /><button className="logout-button" type="button" onClick={onLogout}><LogOut size={16} /><span>Log out</span></button></div>
        </header>

        <main className="dashboard-layout">
          <section className="dashboard-intro">
            <div className="eyebrow"><span className="eyebrow-dot" /> YOUR VIDEO SPACE</div>
            <h1>Good to see you,<br /><span>{displayName}.</span></h1>
            <p className="dashboard-lede">Somewhere out there, someone’s ready for a good conversation. Say hello and see who you meet.</p>
            <div className="steps-card">
              <div className="steps-heading"><span>THE SIMPLE VERSION</span><span className="steps-line" /></div>
              <div className="step-row"><span className="step-number">01</span><span><strong>Start your camera</strong><small>We’ll ask before turning it on.</small></span><ChevronRight size={16} /></div>
              <div className="step-row"><span className="step-number">02</span><span><strong>Meet someone new</strong><small>We’ll find another person who’s ready.</small></span><ChevronRight size={16} /></div>
              <div className="step-row"><span className="step-number">03</span><span><strong>Stay or skip</strong><small>You choose when the conversation ends.</small></span><ChevronRight size={16} /></div>
            </div>
            <div className="privacy-note"><ShieldCheck size={17} /><span><strong>Your call, your choice.</strong> Your camera and microphone stay off until you start.</span></div>
          </section>

          <section className="video-column" aria-label="Video conversation">
            <div className="video-heading"><div><div className="overline">LIVE VIDEO</div><h2>Meet someone new</h2></div><StatusLabel status={video.status} /></div>
            <div className={`video-stage ${video.remoteStream ? "stage-connected" : ""}`}>
              {video.remoteStream ? (
                <video className="remote-video" ref={remoteVideoRef} autoPlay playsInline />
              ) : (
                <div className="stage-empty">
                  <div className="stage-art" aria-hidden="true"><span className="art-ring ring-a" /><span className="art-ring ring-b" /><span className="art-core"><Video size={26} /></span><span className="art-spark spark-a">✳</span><span className="art-spark spark-b">✦</span></div>
                  <div className="stage-title">{video.status === "searching" ? "Your next hello is out there" : video.status === "connecting" ? "One moment…" : "A fresh face is just a click away"}</div>
                  <p>{video.status === "searching" ? "We’re looking for someone who’s ready to talk." : "Start a video conversation whenever you’re ready."}</p>
                  {!isActive && <span className="stage-hint"><LockKeyhole size={13} /> Camera stays off until you start</span>}
                </div>
              )}
              {video.remoteStream && <div className="remote-name"><span className="live-indicator" /> New connection</div>}
              {video.localStream && <div className={`local-video-frame ${!video.cameraOn ? "camera-disabled" : ""}`}>
                <video ref={localVideoRef} autoPlay muted playsInline />
                {!video.cameraOn && <div className="camera-off-overlay"><VideoOff size={20} /><span>Camera off</span></div>}
                <span className="local-video-caption">You</span>
              </div>}
              {video.status === "error" && <button className="stage-dismiss" type="button" onClick={video.stop} aria-label="Dismiss"><X size={15} /></button>}
            </div>
            {video.error && <div className="video-error" role="status"><CircleHelp size={16} />{video.error}</div>}
            <div className="video-controls">
              {isActive ? (
                <>
                  <button className="button button-secondary next-button" type="button" disabled={video.status === "requesting"} onClick={video.next}><ArrowDownLeft size={17} />Next person</button>
                  <div className="media-controls">
                    <button className={`round-control ${!video.micOn ? "control-off" : ""}`} type="button" onClick={video.toggleMic} aria-label={video.micOn ? "Mute microphone" : "Unmute microphone"} title={video.micOn ? "Mute microphone" : "Unmute microphone"}>{video.micOn ? <Mic size={17} /> : <MicOff size={17} />}</button>
                    <button className={`round-control ${!video.cameraOn ? "control-off" : ""}`} type="button" onClick={video.toggleCamera} aria-label={video.cameraOn ? "Turn camera off" : "Turn camera on"} title={video.cameraOn ? "Turn camera off" : "Turn camera on"}>{video.cameraOn ? <Camera size={17} /> : <VideoOff size={17} />}</button>
                  </div>
                  <button className="button button-stop" type="button" onClick={video.stop}><X size={17} />Stop</button>
                </>
              ) : (
                <button className="button button-primary start-button" type="button" onClick={video.start} disabled={video.status === "requesting"}>
                  {video.status === "requesting" ? <LoaderCircle className="spin" size={18} /> : <Video size={18} />}
                  {video.status === "requesting" ? "Starting camera…" : "Start video"}<ArrowRight size={17} />
                </button>
              )}
            </div>
            <div className="video-caption"><span><LockKeyhole size={13} /> Your video is direct between you and your match.</span><span>Video only <span className="caption-dot">·</span> No chat</span></div>
          </section>
        </main>
        <footer className="page-footer home-footer"><span>© 2026 Orbit</span><span><Check size={13} /> Leave whenever you like</span></footer>
      </div>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem("orbit-theme") || "dark");
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = readSession();
    if (!stored?.refreshToken || !stored?.user) {
      clearSession();
      setLoading(false);
      return;
    }
    refreshSession(stored)
      .then((freshSession) => {
        saveSession(freshSession);
        setSession(freshSession);
      })
      .catch(() => clearSession())
      .finally(() => setLoading(false));
  }, []);

  function toggleTheme() {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      localStorage.setItem("orbit-theme", next);
      return next;
    });
  }

  async function logout() {
    if (session?.accessToken) {
      try {
        await apiRequest("/users/logout", { method: "POST", token: session.accessToken });
      } catch {
        // Clear the local session even if the server session has already expired.
      }
    }
    clearSession();
    setSession(null);
  }

  if (loading) {
    return <div className={`app-shell theme-${theme}`}><div className="app-loading"><span className="loading-mark"><Compass size={21} /></span><LoaderCircle className="spin" size={18} /></div></div>;
  }

  return session
    ? <VideoHome session={session} theme={theme} onToggleTheme={toggleTheme} onLogout={logout} />
    : <AuthScreen theme={theme} onToggleTheme={toggleTheme} onAuthenticated={setSession} />;
}
