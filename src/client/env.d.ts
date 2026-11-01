// Globals shared between the inline page scripts.
interface Window {
  /** The splash-into-header animation's frame update; the snapping spring calls it. */
  __recede?: () => void;
}
