import {
  EyeIcon,
  MapIcon,
  MegaphoneIcon,
  MessageSquareTextIcon,
  PauseIcon,
  PlayIcon,
  PlugIcon,
  RotateCcwIcon,
  SirenIcon,
  SlidersHorizontalIcon,
  TriangleAlertIcon,
  Undo2Icon,
  UnplugIcon,
} from "lucide-react";

/** Icons for the ⌘K actions (kept as elements so the store holds plain ReactNodes). */
export const commandIcons = {
  play: <PlayIcon />,
  pause: <PauseIcon />,
  WATCH: <EyeIcon />,
  WARNING: <TriangleAlertIcon />,
  EMERGENCY: <SirenIcon />,
  unplug: <UnplugIcon />,
  plug: <PlugIcon />,
  sms: <MessageSquareTextIcon />,
  reset: <RotateCcwIcon />,
  scenario: <MapIcon />,
  whatIf: <SlidersHorizontalIcon />,
  broadcast: <MegaphoneIcon />,
  undo: <Undo2Icon />,
} as const;
