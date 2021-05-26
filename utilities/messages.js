import { StatusMessage } from 'lively.halos';
import { Icon } from 'lively.morphic';
import { Color } from 'lively.graphics';

export function error (message = 'Error!', props = {}) {
  const { color = Color.red, delay = 4000 } = props;
  const statusMessage = new StatusMessage({ message, color, hasFixedPosition: true, ...props });
  Icon.setIcon(statusMessage.submorphs[0], 'times-circle');
  console.error(message);
  $world.openStatusMessage(statusMessage, delay);
}
