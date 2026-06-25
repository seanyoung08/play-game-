import { FormEvent, useState } from 'react';
import { LogIn, Store } from 'lucide-react';
import { useGameStore } from '../game/useGameStore';

export function LoginScreen() {
  const login = useGameStore((store) => store.login);
  const register = useGameStore((store) => store.register);
  const toast = useGameStore((store) => store.toast);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      if (mode === 'login') {
        await login(username, password);
      } else {
        await register(username, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    }
  }

  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="login-brand">
          <Store size={28} />
          <div>
            <h1>街角小店</h1>
            <p>{toast}</p>
          </div>
        </div>
        <form className="login-form" onSubmit={submit}>
          <label>
            用户名
            <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
          </label>
          <label>
            密码
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" />
          </label>
          {error ? <p className="login-error">{error}</p> : null}
          <button className="day-button" type="submit">
            <LogIn size={18} />
            {mode === 'login' ? '登录进入游戏' : '注册并开店'}
          </button>
          <button className="secondary-button" type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? '没有账号，注册一个' : '已有账号，去登录'}
          </button>
        </form>
      </section>
    </main>
  );
}
