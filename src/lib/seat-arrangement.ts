export interface Seat {
  id: string
  row: number
  col: number
  isDouble: boolean
  pairedWith?: string
}

export interface Student {
  id: number
  name: string
  preferences: {
    position: 'front' | 'middle' | 'back' | 'any'
    wantToSitWith: number[]
    notWantToSitWith: number[]
    preferAlone: boolean
  }
  assignedSeatId?: string
}

export const generateDefaultSeats = (numStudents: number): Seat[] => {
  const seats: Seat[] = []
  const cols = Math.min(6, Math.ceil(Math.sqrt(numStudents)))
  const rows = Math.ceil(numStudents / cols)

  let seatId = 0
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (seatId < numStudents) {
        seats.push({
          id: `seat-${seatId}`,
          row,
          col,
          isDouble: false,
        })
        seatId++
      }
    }
  }

  return seats
}

export const generateDefaultStudents = (numStudents: number): Student[] => {
  return Array.from({ length: numStudents }, (_, i) => ({
    id: i + 1,
    name: `Student ${i + 1}`,
    preferences: {
      position: 'any' as const,
      wantToSitWith: [],
      notWantToSitWith: [],
      preferAlone: false,
    },
  }))
}

export const getAdjacentSeats = (seat: Seat, allSeats: Seat[]): string[] => {
  return allSeats
    .filter((s) => s.row === seat.row && Math.abs(s.col - seat.col) === 1)
    .map((s) => s.id)
}

export const getNeighborSeats = (seat: Seat, allSeats: Seat[]): string[] => {
  return allSeats
    .filter(
      (s) =>
        (s.row === seat.row && Math.abs(s.col - seat.col) === 1) ||
        (s.col === seat.col && Math.abs(s.row - seat.row) === 1),
    )
    .map((s) => s.id)
}

export const arrangeSeats = (students: Student[], seats: Seat[]): Student[] => {
  const arrangedStudents: Student[] = students.map((s) => ({ ...s, assignedSeatId: undefined }))
  const availableSeats = new Set(seats.map((s) => s.id))

  const totalRows = Math.max(...seats.map((s) => s.row), 0) + 1

  const getSeatPosition = (seat: Seat): 'front' | 'middle' | 'back' => {
    const third = Math.ceil(totalRows / 3)
    if (seat.row < third) return 'front'
    if (seat.row < third * 2) return 'middle'
    return 'back'
  }

  const getSeatById = (id: string) => seats.find((s) => s.id === id)

  const getAssignedStudent = (seatId: string) =>
    arrangedStudents.find((s) => s.assignedSeatId === seatId)

  const isPositionCompatible = (student: Student, seat: Seat): boolean => {
    if (student.preferences.position === 'any') return true
    return getSeatPosition(seat) === student.preferences.position
  }

  const getSideBySideSeats = (seat: Seat): string[] => {
    return getAdjacentSeats(seat, seats)
  }

  const findAvailableSideBySidePairs = (): [Seat, Seat][] => {
    const pairs: [Seat, Seat][] = []
    const seen = new Set<string>()

    for (const seatId of availableSeats) {
      const seat = getSeatById(seatId)
      if (!seat || seat.isDouble) continue

      const sideIds = getSideBySideSeats(seat)
      for (const sideId of sideIds) {
        if (!availableSeats.has(sideId)) continue

        const sideSeat = getSeatById(sideId)
        if (!sideSeat || sideSeat.isDouble) continue

        const pairKey = [seatId, sideId].sort().join('-')
        if (seen.has(pairKey)) continue
        seen.add(pairKey)

        pairs.push([seat, sideSeat])
      }
    }

    return pairs
  }

  const preferAloneStudents = arrangedStudents.filter((s) => s.preferences.preferAlone)

  for (const student of preferAloneStudents) {
    let bestSeat: Seat | null = null
    let bestScore = -Infinity

    const availableSeatList = Array.from(availableSeats)
      .map((id) => getSeatById(id))
      .filter(Boolean) as Seat[]

    for (const seat of availableSeatList) {
      if (seat.isDouble) continue

      let score = 0

      if (isPositionCompatible(student, seat)) score += 50

      const neighbors = getNeighborSeats(seat, seats)
      const occupiedNeighbors = neighbors.filter((nId) => getAssignedStudent(nId))
      score -= occupiedNeighbors.length * 20

      if (neighbors.length === 0) score += 30

      for (const neighborId of neighbors) {
        const neighborStudent = getAssignedStudent(neighborId)
        if (neighborStudent && student.preferences.notWantToSitWith.includes(neighborStudent.id)) {
          score -= 100
        }
      }

      if (score > bestScore) {
        bestScore = score
        bestSeat = seat
      }
    }

    if (bestSeat) {
      student.assignedSeatId = bestSeat.id
      availableSeats.delete(bestSeat.id)
    }
  }

  const processedPairs = new Set<string>()

  for (const student of arrangedStudents) {
    if (student.assignedSeatId) continue
    if (student.preferences.preferAlone) continue
    if (student.preferences.wantToSitWith.length === 0) continue

    for (const friendId of student.preferences.wantToSitWith) {
      const pairKey = [Math.min(student.id, friendId), Math.max(student.id, friendId)].join('-')
      if (processedPairs.has(pairKey)) continue

      const friend = arrangedStudents.find((s) => s.id === friendId)
      if (!friend || friend.assignedSeatId || friend.preferences.preferAlone) continue

      const isMutual = friend.preferences.wantToSitWith.includes(student.id)

      if (isMutual) {
        const sideBySidePairs = findAvailableSideBySidePairs()

        let bestPair: [Seat, Seat] | null = null
        let bestScore = -Infinity

        for (const [seat1, seat2] of sideBySidePairs) {
          let score = 200

          if (isPositionCompatible(student, seat1)) score += 40
          if (isPositionCompatible(friend, seat2)) score += 40

          const seat1Neighbors = getNeighborSeats(seat1, seats).filter((id) => id !== seat2.id)
          const seat2Neighbors = getNeighborSeats(seat2, seats).filter((id) => id !== seat1.id)

          for (const nId of seat1Neighbors) {
            const nStudent = getAssignedStudent(nId)
            if (nStudent && student.preferences.notWantToSitWith.includes(nStudent.id)) score -= 100
          }

          for (const nId of seat2Neighbors) {
            const nStudent = getAssignedStudent(nId)
            if (nStudent && friend.preferences.notWantToSitWith.includes(nStudent.id)) score -= 100
          }

          if (score > bestScore) {
            bestScore = score
            bestPair = [seat1, seat2]
          }
        }

        if (bestPair) {
          student.assignedSeatId = bestPair[0].id
          friend.assignedSeatId = bestPair[1].id
          availableSeats.delete(bestPair[0].id)
          availableSeats.delete(bestPair[1].id)
          processedPairs.add(pairKey)
          break
        }
      }
    }
  }

  const studentsWithOneWayPrefs = arrangedStudents.filter(
    (s) => !s.assignedSeatId && s.preferences.wantToSitWith.length > 0 && !s.preferences.preferAlone,
  )

  for (const student of studentsWithOneWayPrefs) {
    if (student.assignedSeatId) continue

    for (const friendId of student.preferences.wantToSitWith) {
      const friend = arrangedStudents.find((s) => s.id === friendId && s.assignedSeatId)
      if (!friend || !friend.assignedSeatId) continue

      const friendSeat = getSeatById(friend.assignedSeatId)
      if (!friendSeat) continue

      const sideSeats = getSideBySideSeats(friendSeat)
      let bestSeat: Seat | null = null
      let bestScore = -Infinity

      for (const sideId of sideSeats) {
        if (!availableSeats.has(sideId)) continue

        const sideSeat = getSeatById(sideId)
        if (!sideSeat || sideSeat.isDouble) continue

        let score = 150

        if (isPositionCompatible(student, sideSeat)) score += 40

        const neighbors = getNeighborSeats(sideSeat, seats).filter((id) => id !== friendSeat.id)
        for (const nId of neighbors) {
          const nStudent = getAssignedStudent(nId)
          if (nStudent && student.preferences.notWantToSitWith.includes(nStudent.id)) score -= 100
        }

        if (score > bestScore) {
          bestScore = score
          bestSeat = sideSeat
        }
      }

      if (bestSeat) {
        student.assignedSeatId = bestSeat.id
        availableSeats.delete(bestSeat.id)
        break
      }
    }

    if (!student.assignedSeatId) {
      const sideBySidePairs = findAvailableSideBySidePairs()

      if (sideBySidePairs.length > 0) {
        const unassignedNoPref = arrangedStudents.find(
          (s) =>
            !s.assignedSeatId &&
            s.id !== student.id &&
            !s.preferences.preferAlone &&
            s.preferences.wantToSitWith.length === 0,
        )

        if (unassignedNoPref) {
          let bestPair: [Seat, Seat] | null = null
          let bestScore = -Infinity

          for (const [seat1, seat2] of sideBySidePairs) {
            let score = 100

            if (isPositionCompatible(student, seat1)) score += 40

            const seat1Neighbors = getNeighborSeats(seat1, seats).filter((id) => id !== seat2.id)
            for (const nId of seat1Neighbors) {
              const nStudent = getAssignedStudent(nId)
              if (nStudent && student.preferences.notWantToSitWith.includes(nStudent.id)) score -= 100
            }

            if (score > bestScore) {
              bestScore = score
              bestPair = [seat1, seat2]
            }
          }

          if (bestPair) {
            student.assignedSeatId = bestPair[0].id
            unassignedNoPref.assignedSeatId = bestPair[1].id
            availableSeats.delete(bestPair[0].id)
            availableSeats.delete(bestPair[1].id)
          }
        }
      }
    }
  }

  const remainingUnassigned = arrangedStudents.filter(
    (s) => !s.assignedSeatId && !s.preferences.preferAlone,
  )

  remainingUnassigned.sort((a, b) => {
    const aHasPref = a.preferences.position !== 'any' ? 1 : 0
    const bHasPref = b.preferences.position !== 'any' ? 1 : 0
    return bHasPref - aHasPref
  })

  for (let i = 0; i < remainingUnassigned.length; i += 2) {
    const student1 = remainingUnassigned[i]
    const student2 = remainingUnassigned[i + 1]

    if (student1.assignedSeatId) continue

    // If there's no student2, just assign a single seat
    if (!student2) {
      const availableSeatList = Array.from(availableSeats)
        .map((id) => getSeatById(id))
        .filter(Boolean) as Seat[]

      let bestSeat: Seat | null = null
      let bestScore = -Infinity

      for (const seat of availableSeatList) {
        if (seat.isDouble) continue

        let score = 50
        if (isPositionCompatible(student1, seat)) score += 30

        if (score > bestScore) {
          bestScore = score
          bestSeat = seat
        }
      }

      if (bestSeat) {
        student1.assignedSeatId = bestSeat.id
        availableSeats.delete(bestSeat.id)
      }
      continue
    }

    const sideBySidePairs = findAvailableSideBySidePairs()

    if (sideBySidePairs.length > 0) {
      let bestPair: [Seat, Seat] | null = null
      let bestScore = -Infinity

      for (const [seat1, seat2] of sideBySidePairs) {
        let score = 50

        if (isPositionCompatible(student1, seat1)) score += 30
        if (isPositionCompatible(student2, seat2)) score += 30

        if (score > bestScore) {
          bestScore = score
          bestPair = [seat1, seat2]
        }
      }

      if (bestPair) {
        student1.assignedSeatId = bestPair[0].id
        availableSeats.delete(bestPair[0].id)

        if (!student2.assignedSeatId) {
          student2.assignedSeatId = bestPair[1].id
          availableSeats.delete(bestPair[1].id)
        }
      }
    }
  }

  for (const student of arrangedStudents) {
    const requiresPairing =
      student.preferences.wantToSitWith.length > 0 && !student.preferences.preferAlone

    if (!student.assignedSeatId && availableSeats.size > 0 && !requiresPairing) {
      // Filter seats by position preference if student has one
      const availableSeatList = Array.from(availableSeats)
        .map((id) => getSeatById(id))
        .filter(Boolean) as Seat[]

      let bestSeat: Seat | null = null
      let bestScore = -Infinity

      for (const seat of availableSeatList) {
        if (seat.isDouble) continue

        let score = 0
        if (isPositionCompatible(student, seat)) score += 50

        if (score > bestScore) {
          bestScore = score
          bestSeat = seat
        }
      }

      if (bestSeat) {
        student.assignedSeatId = bestSeat.id
        availableSeats.delete(bestSeat.id)
      }
    }
  }

  return arrangedStudents
}
