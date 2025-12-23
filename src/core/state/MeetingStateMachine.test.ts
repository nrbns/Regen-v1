import { eventBus } from './eventBus';
import { meetingStateMachine, MeetingState } from './MeetingStateMachine';

describe('MeetingStateMachine', () => {
  let states: MeetingState[] = [];
  beforeEach(() => {
    states = [];
    eventBus.off('meeting:state');
    eventBus.on('meeting:state', (state: MeetingState) => states.push(state));
    meetingStateMachine.reset();
  });

  afterEach(() => {
    eventBus.off('meeting:state');
  });

  it('should transition CONNECTED → DEGRADED → OFFLINE', async () => {
    eventBus.emit('connection:status', true);
    await new Promise(r => setTimeout(r, 20));
    expect(meetingStateMachine.getState()).toBe('CONNECTED');
    await new Promise(r => setTimeout(r, 10100)); // Wait for degrade
    expect(meetingStateMachine.getState()).toBe('DEGRADED');
    await new Promise(r => setTimeout(r, 10100)); // Wait for offline
    expect(meetingStateMachine.getState()).toBe('OFFLINE');
    expect(states).toEqual(['CONNECTED', 'DEGRADED', 'OFFLINE']);
  });

  it('should debounce rapid connection:status events', async () => {
    eventBus.emit('connection:status', true);
    eventBus.emit('connection:status', false);
    eventBus.emit('connection:status', true);
    await new Promise(r => setTimeout(r, 200));
    expect(['CONNECTED', 'OFFLINE']).toContain(meetingStateMachine.getState());
  });

  it('should only allow valid degrade/recover transitions', async () => {
    eventBus.emit('connection:status', true);
    await new Promise(r => setTimeout(r, 20));
    eventBus.emit('connection:degraded');
    expect(meetingStateMachine.getState()).toBe('DEGRADED');
    eventBus.emit('connection:recovered');
    expect(meetingStateMachine.getState()).toBe('RECOVERED');
    await new Promise(r => setTimeout(r, 2100));
    expect(meetingStateMachine.getState()).toBe('CONNECTED');
  });

  it('should not allow RECOVERED from CONNECTED', async () => {
    eventBus.emit('connection:status', true);
    await new Promise(r => setTimeout(r, 20));
    eventBus.emit('connection:recovered');
    expect(meetingStateMachine.getState()).toBe('CONNECTED');
  });
});
