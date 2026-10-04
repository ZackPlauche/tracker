import { MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'

/** Mouse + touch, not pointer. PointerSensor fights TouchSensor on phones and the drag never starts. */
export function useReorderSensors() {
  return useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 10 },
    }),
  )
}
