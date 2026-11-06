import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Minimal in-memory fakes of the Firebase SDK pieces the provider is allowed to use.
const h = vi.hoisted(() => {
  type Listener = (user: { uid: string } | null) => void;
  const state = {
    currentUser: null as { uid: string; isAnonymous?: boolean } | null,
    listeners: [] as Listener[],
    docs: new Map<string, Record<string, unknown>>(),
    signInError: null as Error | null,
    signInCalls: 0,
    nextUid: 1,
    docListeners: [] as {
      path: string;
      cb: (snap: { data: () => unknown; metadata: { fromCache: boolean } }) => void;
    }[],
    // Pending reads per document path, to simulate slow queries.
    gates: new Map<string, Promise<void>>(),
  };
  const emit = () => state.listeners.forEach((l) => l(state.currentUser));
  const notify = (path: string) =>
    state.docListeners
      .filter((l) => l.path === path)
      .forEach((l) => l.cb({ data: () => state.docs.get(path), metadata: { fromCache: false } }));
  const write = (path: string, data: Record<string, unknown>) => {
    state.docs.set(path, { ...(state.docs.get(path) ?? {}), ...data });
    notify(path);
  };
  return { state, emit, notify, write };
});

vi.mock('../../lib/firebase', () => ({
  auth: {
    __fake: 'auth',
    get currentUser() {
      return h.state.currentUser;
    },
  },
  db: { __fake: 'db' },
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth: unknown, cb: (u: { uid: string } | null) => void) => {
    h.state.listeners.push(cb);
    queueMicrotask(() => cb(h.state.currentUser));
    return () => {
      h.state.listeners = h.state.listeners.filter((l) => l !== cb);
    };
  },
  signInAnonymously: async () => {
    h.state.signInCalls += 1;
    if (h.state.signInError) throw h.state.signInError;
    h.state.currentUser = { uid: `anon-${h.state.nextUid++}` };
    h.emit();
    return { user: h.state.currentUser };
  },
}));

vi.mock('firebase/firestore', () => {
  const doc = (_db: unknown, ...segments: string[]) => ({ path: segments.join('/') });
  const getDoc = async (ref: { path: string }) => {
    await h.state.gates.get(ref.path);
    const data = h.state.docs.get(ref.path);
    return { exists: () => data !== undefined, data: () => data };
  };
  const setDoc = async (ref: { path: string }, data: Record<string, unknown>) => h.write(ref.path, data);
  const onSnapshot = (
    ref: { path: string },
    cb: (snap: { data: () => unknown; metadata: { fromCache: boolean } }) => void,
  ) => {
    const entry = { path: ref.path, cb };
    h.state.docListeners.push(entry);
    queueMicrotask(() => cb({ data: () => h.state.docs.get(ref.path), metadata: { fromCache: false } }));
    return () => {
      h.state.docListeners = h.state.docListeners.filter((l) => l !== entry);
    };
  };
  return {
    doc,
    getDoc,
    setDoc,
    onSnapshot,
    serverTimestamp: () => '__server_timestamp__',
    runTransaction: async (
      _db: unknown,
      fn: (tx: { get: typeof getDoc; set: typeof setDoc; update: typeof setDoc }) => Promise<unknown>,
    ) => fn({ get: getDoc, set: setDoc, update: setDoc }),
  };
});

import { AuthProvider, useAuth } from '../AuthProvider';

function Probe() {
  const { user, profile, loading, error, completeOnboarding, refreshCurrentUser } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="uid">{user?.uid ?? 'none'}</span>
      <span data-testid="anonymous">{String(user?.isAnonymous ?? 'none')}</span>
      <span data-testid="onboarding">{String(profile?.onboardingCompleted ?? 'none')}</span>
      {error ? <p role="alert">{error}</p> : null}
      <button onClick={() => void completeOnboarding()}>Concluir</button>
      <button onClick={refreshCurrentUser}>Atualizar conta</button>
    </div>
  );
}

const renderProvider = () =>
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );

beforeEach(() => {
  h.state.currentUser = null;
  h.state.listeners = [];
  h.state.docs.clear();
  h.state.signInError = null;
  h.state.signInCalls = 0;
  h.state.nextUid = 1;
  h.state.docListeners = [];
  h.state.gates.clear();
});

const text = (id: string) => screen.getByTestId(id).textContent;

describe('AuthProvider', () => {
  it('exposes loading until the session resolves, then signs in anonymously', async () => {
    renderProvider();
    expect(screen.getByTestId('loading').textContent).toBe('true');
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('uid').textContent).toBe('anon-1');
    expect(h.state.signInCalls).toBe(1);
  });

  it('does not sign in again when a session already exists (same uid)', async () => {
    h.state.currentUser = { uid: 'existing-uid' };
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('uid').textContent).toBe('existing-uid');
    expect(h.state.signInCalls).toBe(0);
  });

  it('refreshes the linked user without reloading the existing profile', async () => {
    h.state.currentUser = { uid: 'anon-1', isAnonymous: true };
    renderProvider();
    await waitFor(() => expect(text('uid')).toBe('anon-1'));
    h.state.currentUser = { uid: 'anon-1', isAnonymous: false };

    screen.getByRole('button', { name: 'Atualizar conta' }).click();

    await waitFor(() => expect(text('anonymous')).toBe('false'));
    expect(text('uid')).toBe('anon-1');
    expect(text('loading')).toBe('false');
  });

  it('creates users/{uid} with the defaults', async () => {
    renderProvider();
    await waitFor(() => expect(h.state.docs.get('users/anon-1')).toBeDefined());
    expect(h.state.docs.get('users/anon-1')).toMatchObject({
      createdAt: '__server_timestamp__',
      onboardingCompleted: false,
      aiConsent: false,
      reminderEnabled: false,
    });
  });

  it('never overwrites an existing users/{uid} document', async () => {
    h.state.currentUser = { uid: 'existing-uid' };
    h.state.docs.set('users/existing-uid', {
      createdAt: 'original',
      onboardingCompleted: true,
      aiConsent: true,
      reminderEnabled: true,
    });
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(h.state.docs.get('users/existing-uid')).toEqual({
      createdAt: 'original',
      onboardingCompleted: true,
      aiConsent: true,
      reminderEnabled: true,
    });
  });

  it('shows a pt-BR error and no user when the sign-in fails on the network', async () => {
    h.state.signInError = Object.assign(new Error('network'), { code: 'auth/network-request-failed' });
    renderProvider();
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/conex|rede|internet/i);
    expect(screen.getByTestId('uid').textContent).toBe('none');
    expect(screen.getByTestId('loading').textContent).toBe('false');
    expect(h.state.docs.size).toBe(0);
  });

  it('shows a network error when the connection fails after authentication', async () => {
    h.state.currentUser = { uid: 'existing-uid' };
    h.state.gates.set(
      'users/existing-uid',
      Promise.reject(Object.assign(new Error('offline'), { code: 'unavailable' })),
    );
    renderProvider();
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/conex|rede|internet/i);
    expect(text('uid')).toBe('none');
    expect(text('loading')).toBe('false');
  });

  it('does not replace the server-confirmed profile with cache-only data', async () => {
    h.state.currentUser = { uid: 'existing-uid' };
    renderProvider();
    await waitFor(() => expect(text('onboarding')).toBe('false'));
    act(() => {
      h.state.docListeners.forEach((listener) =>
        listener.cb({
          data: () => ({ onboardingCompleted: true }),
          metadata: { fromCache: true },
        }),
      );
    });
    expect(text('onboarding')).toBe('false');
  });

  it('updates the profile when onboarding is completed during the session', async () => {
    h.state.currentUser = { uid: 'existing-uid' };
    renderProvider();
    await waitFor(() => expect(text('onboarding')).toBe('false'));
    screen.getByRole('button', { name: 'Concluir' }).click();
    await waitFor(() => expect(text('onboarding')).toBe('true'));
    expect(h.state.docs.get('users/existing-uid')).toMatchObject({ onboardingCompleted: true });
  });

  it('keeps the profile up to date when onboardingCompleted changes during the session', async () => {
    h.state.currentUser = { uid: 'existing-uid' };
    renderProvider();
    await waitFor(() => expect(text('onboarding')).toBe('false'));
    act(() => h.write('users/existing-uid', { onboardingCompleted: true }));
    await waitFor(() => expect(text('onboarding')).toBe('true'));
  });

  it('opens no persistent profile listener for an already completed account', async () => {
    h.state.currentUser = { uid: 'existing-uid' };
    h.state.docs.set('users/existing-uid', { onboardingCompleted: true });
    renderProvider();
    await waitFor(() => expect(text('onboarding')).toBe('true'));
    expect(h.state.docListeners).toHaveLength(0);
    act(() => h.write('users/existing-uid', { onboardingCompleted: false }));
    expect(text('onboarding')).toBe('true');
  });

  it('stops the live profile listener once onboarding completes', async () => {
    h.state.currentUser = { uid: 'existing-uid' };
    renderProvider();
    await waitFor(() => expect(text('onboarding')).toBe('false'));
    expect(h.state.docListeners).toHaveLength(1);
    act(() => h.write('users/existing-uid', { onboardingCompleted: true }));
    await waitFor(() => expect(text('onboarding')).toBe('true'));
    expect(h.state.docListeners).toHaveLength(0);
  });

  it('completes anonymous onboarding without opening a persistent profile listener', async () => {
    h.state.currentUser = { uid: 'anon-user', isAnonymous: true };
    renderProvider();
    await waitFor(() => expect(text('onboarding')).toBe('false'));
    expect(h.state.docListeners).toHaveLength(0);
    screen.getByRole('button', { name: 'Concluir' }).click();
    await waitFor(() => expect(text('onboarding')).toBe('true'));
    expect(h.state.docListeners).toHaveLength(0);
  });

  it('clears the previous user state while a new auth state loads', async () => {
    h.state.currentUser = { uid: 'user-a' };
    renderProvider();
    await waitFor(() => expect(text('uid')).toBe('user-a'));

    let release = () => {};
    h.state.gates.set('users/user-b', new Promise<void>((r) => (release = r)));
    h.state.currentUser = { uid: 'user-b' };
    act(() => h.emit());
    expect(text('uid')).toBe('none');
    expect(text('loading')).toBe('true');
    expect(text('onboarding')).toBe('none');

    await act(async () => release());
    await waitFor(() => expect(text('uid')).toBe('user-b'));
  });

  it('ignores a pending query that belongs to a previous auth state', async () => {
    let release = () => {};
    h.state.gates.set('users/user-a', new Promise<void>((r) => (release = r)));
    h.state.currentUser = { uid: 'user-a' };
    renderProvider();
    await waitFor(() => expect(h.state.listeners.length).toBeGreaterThan(0));

    h.state.currentUser = { uid: 'user-b' };
    act(() => h.emit());
    await waitFor(() => expect(text('uid')).toBe('user-b'));

    await act(async () => release());
    expect(text('uid')).toBe('user-b');
    expect(h.state.docListeners.every((l) => l.path === 'users/user-b')).toBe(true);
    act(() => h.write('users/user-a', { onboardingCompleted: true }));
    expect(text('uid')).toBe('user-b');
    expect(text('onboarding')).toBe('false');
  });
});
