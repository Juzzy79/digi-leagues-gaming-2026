import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, User, Trophy, Users, Swords,
  MessageSquare, BookOpen, Shield, LogOut, ChevronRight,
  PlusCircle, Crown, Share2, Target
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../context/AuthContext'
import { signOut } from '../services/authService'
import Dashboard from '../pages/Dashboard'
import Profile from '../pages/Profile'
import ResultSubmission from '../pages/ResultSubmission'
import Community from '../pages/Community'
import Teams from '../pages/Teams'
import Leaderboard from '../pages/Leaderboard'
import Tournaments from '../pages/Tournaments'
import CircuitPage from '../pages/Circuit'
import Admin from '../pages/Admin'
import Messaging from '../pages/Messaging'
import FieldManual from '../pages/FieldManual'
import SessionConsole from '../pages/SessionConsole'
import Versus from '../pages/Versus'
import HallOfFame from '../pages/HallOfFame'
import WarRoom from '../pages/WarRoom'
import NotificationBell from './NotificationBell'

const navItems = [
  { to: '/app/dashboard',   label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/app/war-room',    label: 'War Room',     icon: Target },
  { to: '/app/submit',      label: 'Submit Result', icon: ChevronRight },
  { to: '/app/leaderboard', label: 'Leaderboard',   icon: Trophy },
  { to: '/app/community',   label: 'Community',     icon: Users },
  { to: '/app/teams',       label: 'Teams',         icon: Shield },
  { to: '/app/tournaments', label: 'Tournaments',   icon: Swords },
  { to: '/app/hall-of-fame', label: 'Hall of Fame', icon: Crown },
  { to: '/app/messages',    label: 'Messages',      icon: MessageSquare },
  { to: '/app/manual',      label: 'Field Manual',  icon: BookOpen },
]

// Mobile bottom nav — most important 4 routes
const mobileNavItems = [
  { to: '/app/dashboard',   label: 'Base',      icon: LayoutDashboard },
  { to: '/app/tournaments', label: 'Compete',   icon: Swords },
  { to: '/app/submit',      label: 'Log',       icon: PlusCircle },
  { to: '/app/messages',    label: 'Chat',      icon: MessageSquare },
]

export default function AppShell() {
  const { profile, user } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await signOut()
    navigate('/auth', { replace: true })
  }

  function handleInvite() {
    const url = window.location.origin + '/auth';
    if (navigator.share) {
      navigator.share({
        title: 'Digi Leagues Gaming',
        text: "Join me on Digi Leagues and let's build our gaming legacy!",
        url: url
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      alert('Invite link copied to clipboard!');
    }
  }

  return (
    <div className="flex min-h-dvh bg-steel-950">

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex w-56 flex-shrink-0 bg-steel-900 border-r border-steel-700 flex-col">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-steel-700">
          <h1 className="text-xl font-display font-bold uppercase tracking-widest text-nexus-400">
            DIGI LEAGUES
          </h1>
          <p className="text-[10px] text-ink-500 font-mono tracking-widest mt-0.5">OPERATIONS CENTRE</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-colors',
                isActive
                  ? 'bg-nexus-900/30 text-nexus-400 border-l-2 border-nexus-500 pl-[10px]'
                  : 'text-ink-300 hover:bg-steel-800 hover:text-ink-100'
              )}
            >
              <Icon size={16} />
              <span className="font-body">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-steel-700 p-3 space-y-2">
          {profile && (
            <NavLink
              to={`/app/profile/${user?.id}`}
              className="flex items-center gap-2.5 px-2 py-2 rounded hover:bg-steel-800 transition-colors"
            >
              {profile.avatar_url ? (
                <img src={profile.avatar_url} className="w-8 h-8 rounded object-cover border border-steel-600" />
              ) : (
                <div className="w-8 h-8 rounded bg-nexus-900 border border-nexus-500/30 flex items-center justify-center">
                  <User size={14} className="text-nexus-400" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-display font-bold text-ink-100 truncate">{profile.username}</p>
                <p className="text-[10px] font-mono text-pulse-400">{profile.usr || 1000} USR</p>
              </div>
            </NavLink>
          )}
          {profile?.is_admin && (
            <NavLink
              to="/app/admin"
              className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-circuit-500 hover:bg-steel-800 transition-colors"
            >
              <Shield size={13} /> Admin Panel
            </NavLink>
          )}
          <button
            onClick={handleInvite}
            className="flex items-center gap-2 px-2 py-1.5 w-full text-left rounded text-xs text-nexus-400 hover:bg-steel-800 transition-colors"
          >
            <Share2 size={13} /> Invite Mates
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-2 py-1.5 w-full text-left rounded text-xs text-ink-500 hover:bg-steel-800 hover:text-threat-500 transition-colors"
          >
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile top header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-steel-900 border-b border-steel-700 sticky top-0 z-20">
          <NavLink to={`/app/profile/${user?.id}`} className="flex items-center gap-2.5">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} className="w-8 h-8 rounded object-cover border border-steel-700" />
            ) : (
              <div className="w-8 h-8 rounded bg-nexus-900 border border-nexus-500/30 flex items-center justify-center">
                <User size={14} className="text-nexus-400" />
              </div>
            )}
            <div>
              <p className="text-xs font-display font-bold text-ink-100 uppercase tracking-wider leading-none">{profile?.username}</p>
              <p className="text-[10px] font-mono text-pulse-400 leading-none mt-0.5">{profile?.usr ?? 1000} USR</p>
            </div>
          </NavLink>

          <div className="flex items-center gap-1">
            <span className="text-lg font-display font-black text-nexus-400 tracking-widest uppercase">DL</span>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={handleInvite} className="p-2 text-ink-400 hover:text-nexus-400 transition-colors">
              <Share2 size={18} />
            </button>
            <NotificationBell />
          </div>
        </header>

        {/* Desktop top-right notification bar */}
        <div className="hidden lg:flex items-center justify-end px-6 py-2 bg-steel-950 border-b border-steel-800/50">
          <NotificationBell />
        </div>

        {/* Page content */}
        <main className="flex-1 flex flex-col min-w-0 overflow-auto pb-16 lg:pb-0">
          <Routes>
            <Route path="dashboard"      element={<Dashboard />} />
            <Route path="profile/:userId" element={<Profile />} />
            <Route path="leaderboard"    element={<Leaderboard />} />
            <Route path="community"      element={<Community />} />
            <Route path="teams"          element={<Teams />} />
            <Route path="tournaments"    element={<Tournaments />} />
            <Route path="circuit/:id"    element={<CircuitPage />} />
            <Route path="messages"       element={<Messaging />} />
            <Route path="submit"         element={<ResultSubmission />} />
            <Route path="manual"         element={<FieldManual />} />
            <Route path="admin"          element={<Admin />} />
            <Route path="session/:id"    element={<SessionConsole />} />
            <Route path="versus/:opponentId" element={<Versus />} />
            <Route path="hall-of-fame"   element={<HallOfFame />} />
            <Route path="war-room"       element={<WarRoom />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Routes>
        </main>

        {/* ── Mobile Bottom Navigation ── */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-steel-900/95 backdrop-blur-md border-t border-steel-700 flex items-stretch" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {mobileNavItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => clsx(
                'flex-1 flex flex-col items-center justify-center py-2 gap-1 text-[10px] font-mono uppercase tracking-wider transition-colors',
                isActive
                  ? 'text-nexus-400 bg-nexus-900/20'
                  : 'text-ink-600 hover:text-ink-300'
              )}
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
          {/* Profile link */}
          <NavLink
            to={`/app/profile/${user?.id}`}
            className={({ isActive }) => clsx(
              'flex-1 flex flex-col items-center justify-center py-2 gap-1 text-[10px] font-mono uppercase tracking-wider transition-colors',
              isActive
                ? 'text-nexus-400 bg-nexus-900/20'
                : 'text-ink-600 hover:text-ink-300'
            )}
          >
            <User size={20} />
            <span>Profile</span>
          </NavLink>
        </nav>

      </div>
    </div>
  )
}
