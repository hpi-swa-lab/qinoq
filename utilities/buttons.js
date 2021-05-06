import { resource } from 'lively.resources';
export async function buildIconButton (options = {}) {
  const {
    target, action, args, command = undefined, tooltip,
    morphName = 'anIconButton', icon, label = '', container, collapsed = true,
    autoResize = true, mode = false
  } = options;

  const button = await resource('part://QinoqWidgets/icon button light').read();

  Object.assign(button, {
    master: {
      auto: 'styleguide://QinoqWidgets/icon button/default/light',
      hover: 'styleguide://QinoqWidgets/icon button/hover/light',
      click: 'styleguide://QinoqWidgets/icon button/active/light'
    },
    target: target,
    action: action,
    args: args,
    masterButtonDeactivated: 'styleguide://QinoqWidgets/icon button/disabled/light',
    collapsed: collapsed,
    autoResize: autoResize,
    name: morphName,
    description: tooltip,
    icon: icon,
    label: label,
    mode: mode
  });

  if (command) button.command = command;
  return button;
}
