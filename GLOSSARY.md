# pi-notify

Cross-platform delivery of notifications for Pi agent lifecycle events. One notification is routed to the platforms the user enabled; each platform is an independent delivery channel.

## Language

**Notification platform**:
A delivery channel a notification can be routed to; platforms are independent and each reports its own outcome.
_Avoid_: channel, provider, transport, notification method

**BEL**:
The ASCII bell control byte (`0x07`) written to an interactive terminal to request the human's attention; the terminal decides whether that becomes an audible beep, a visual flash, a window flag, or nothing.
_Avoid_: bell character, beep, alarm

**Blocking event**:
An event where the agent is parked waiting on a human, so nothing progresses until the human acts.
_Avoid_: prompt event, wait event

**Re-notify**:
A repeated reminder for an unanswered blocking event, marked as still waiting.
_Avoid_: repeat, retry
