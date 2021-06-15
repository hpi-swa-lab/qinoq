import { StatusMessage } from 'lively.halos';
import { Icon } from 'lively.morphic';
import { Color } from 'lively.graphics';

export function error (message = 'Error!', props = {}) {
  const { color = Color.red, delay = 4000 } = props;
  const statusMessage = new StatusMessage({ message, color, hasFixedPosition: true, ...props });
  Icon.setIcon(statusMessage.submorphs[0], 'times-circle');
  // eslint-disable-next-line no-console
  console.error(message);
  $world.openStatusMessage(statusMessage, delay);
}

export function success (message = 'Success!', props = {}) {
  const { color = Color.green, delay = 4000 } = props;
  const statusMessage = new StatusMessage({ message, color, hasFixedPosition: true, ...props });
  $world.openStatusMessage(statusMessage, delay);
}
