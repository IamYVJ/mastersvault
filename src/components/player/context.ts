import type { Tool } from '../../lib/content/schema.ts';
import type { TestPayload } from '../../lib/content/types.ts';
import type { ActionInput, Attempt, Rules } from '../../lib/engine/attempt.ts';

/** On-screen tools available in the current section. */
export interface ToolBar {
  available: Tool[];
  open: Tool[];
  toggle: (tool: Tool) => void;
}

/** Everything a player screen needs. */
export interface PlayerProps {
  payload: TestPayload;
  attempt: Attempt;
  rules: Rules;
  act: (action: ActionInput) => void;
  requestExit: () => void;
  tools: ToolBar;
}
