import { emptyState, workflow } from './presentation';

describe('workflow', () => {
  it('starts at step one when idle', () => {
    expect(workflow('host', false, 'idle').map((step) => step.state)).toEqual(['active', 'upcoming', 'upcoming']);
  });
  it('advances to invitation once a room exists', () => {
    expect(workflow('host', true, 'waiting').map((step) => step.state)).toEqual(['complete', 'active', 'upcoming']);
  });
  it('completes everything when live', () => {
    expect(workflow('host', true, 'live').map((step) => step.state)).toEqual(['complete', 'complete', 'complete']);
  });
  it('uses viewer wording for viewers', () => {
    expect(workflow('viewer', true, 'waiting')[0]?.title).toBe('Invite opened');
  });
});

describe('emptyState', () => {
  it('tells a waiting viewer the presenter is next', () => {
    expect(emptyState('viewer', true, 'waiting').title).toMatch(/presenter/);
  });
  it('invites a presenter to start sharing', () => {
    expect(emptyState('host', false, 'idle').caption).toMatch(/begin/);
  });
  it('confirms to the presenter that sharing stopped when they end the session', () => {
    const state = emptyState('host', false, 'ended', { role: 'host', reason: 'local', seconds: 125 });
    expect(state.title).toBe('Session ended');
    expect(state.description).toMatch(/no longer works/);
    expect(state.caption).toBe('Session length 02:05');
  });
  it('explains a stop from the browser sharing bar', () => {
    expect(emptyState('host', false, 'ended', { role: 'host', reason: 'source-stopped', seconds: 0 }).description).toMatch(/from the browser/);
  });
  it('tells a viewer the presenter ended the session', () => {
    expect(emptyState('host', false, 'ended', { role: 'viewer', reason: 'remote', seconds: 10 }).description).toMatch(/presenter ended/);
  });
  it('falls back to the idle copy without a summary', () => {
    expect(emptyState('host', false, 'ended').title).toBe('No active stream');
  });
});
