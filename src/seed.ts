import { v4 as uuid } from 'uuid'
import type { AppData, Event } from './types'

function daysAgo(n: number, hour = 12): number {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(hour, Math.floor(Math.random() * 50), 0, 0)
  return d.getTime()
}

function makeEvents(metricId: string, counts: number[]): Event[] {
  const events: Event[] = []
  counts.forEach((count, dayOffset) => {
    for (let i = 0; i < count; i++) {
      events.push({
        id: uuid(),
        metricId,
        timestamp: daysAgo(dayOffset, 10 + (i % 10)),
        delta: 1,
      })
    }
  })
  return events
}

export function createSeedData(): AppData {
  const datingOpens = uuid()
  const datingNumbers = uuid()
  const musicWalkins = uuid()
  const musicFollowups = uuid()
  const musicBookings = uuid()

  const datingId = uuid()
  const musicId = uuid()

  // Sample: last 14 days-ish for dating (today + past)
  // opens higher than numbers
  const opensCounts = [3, 5, 2, 4, 6, 1, 3, 4, 2, 5, 3, 2, 4, 1]
  const numbersCounts = [1, 2, 0, 1, 3, 0, 1, 2, 1, 2, 1, 0, 2, 0]

  const walkinCounts = [8, 12, 5, 9, 15, 4, 7, 10, 6, 11, 8, 5, 9, 3]
  const followupCounts = [3, 5, 2, 4, 6, 1, 3, 4, 2, 5, 3, 2, 4, 1]
  const bookingCounts = [1, 2, 0, 1, 2, 0, 1, 1, 0, 2, 1, 0, 1, 0]

  const events: Event[] = [
    ...makeEvents(datingOpens, opensCounts),
    ...makeEvents(datingNumbers, numbersCounts),
    ...makeEvents(musicWalkins, walkinCounts),
    ...makeEvents(musicFollowups, followupCounts),
    ...makeEvents(musicBookings, bookingCounts),
  ]

  return {
    activeFunnelId: datingId,
    funnels: [
      {
        id: datingId,
        name: 'Dating',
        createdAt: Date.now() - 30 * 86400000,
        metrics: [
          { id: datingOpens, name: 'Opens', order: 0 },
          { id: datingNumbers, name: 'Numbers', order: 1 },
        ],
      },
      {
        id: musicId,
        name: 'Music',
        createdAt: Date.now() - 20 * 86400000,
        metrics: [
          { id: musicWalkins, name: 'Walk-ins', order: 0 },
          { id: musicFollowups, name: 'Follow-ups', order: 1 },
          { id: musicBookings, name: 'Bookings', order: 2 },
        ],
      },
    ],
    events,
  }
}
