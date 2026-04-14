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

  const getSeatById = (id: string) => seats.find((s) => s.id === id)

  const getAssignedStudent = (seatId: string) =>
    arrangedStudents.find((s) => s.assignedSeatId === seatId)

  // Helper: check if student A should NOT be paired with student B based on B's preferences
  const isPairingBlockedByFriend = (studentId: number, friendId: number): boolean => {
    const friend = arrangedStudents.find((s) => s.id === friendId)
    if (!friend) return true

    // Friend prefers alone → blocks pairing
    if (friend.preferences.preferAlone) return true

    // Friend has student in "not want" → blocks pairing
    if (friend.preferences.notWantToSitWith.includes(studentId)) return true

    return false
  }

  // Helper: check if two students have a valid mutual want (neither blocks the other)
  const isValidMutualPair = (studentId: number, friendId: number): boolean => {
    const student = arrangedStudents.find((s) => s.id === studentId)
    const friend = arrangedStudents.find((s) => s.id === friendId)
    if (!student || !friend) return false

    // Both must want each other
    if (!student.preferences.wantToSitWith.includes(friendId)) return false
    if (!friend.preferences.wantToSitWith.includes(studentId)) return false

    // Neither should block the other
    if (isPairingBlockedByFriend(studentId, friendId)) return false
    if (isPairingBlockedByFriend(friendId, studentId)) return false

    return true
  }

  const findBestSeat = (student: Student, excludeSeats: Set<string> = new Set()): Seat | null => {
    let bestSeat: Seat | null = null
    let bestScore = -Infinity

    const availableSeatList = Array.from(availableSeats)
      .filter((id) => !excludeSeats.has(id))
      .map((id) => getSeatById(id))
      .filter(Boolean) as Seat[]

    for (const seat of availableSeatList) {
      let score = 0

      const neighbors = getNeighborSeats(seat, seats)
      const occupiedNeighbors = neighbors.filter((nId) => getAssignedStudent(nId))
      score -= occupiedNeighbors.length * 10

      if (student.preferences.preferAlone) {
        score -= occupiedNeighbors.length * 30
        if (neighbors.length === 0) score += 40
      }

      for (const neighborId of neighbors) {
        const neighborStudent = getAssignedStudent(neighborId)
        if (neighborStudent && student.preferences.notWantToSitWith.includes(neighborStudent.id)) {
          score -= 150
        }
        if (neighborStudent && student.preferences.wantToSitWith.includes(neighborStudent.id)) {
          score += 80
        }
      }

      if (score > bestScore) {
        bestScore = score
        bestSeat = seat
      }
    }

    return bestScore > -Infinity ? bestSeat : null
  }

  const assignStudentToSeat = (student: Student, seat: Seat): void => {
    student.assignedSeatId = seat.id
    availableSeats.delete(seat.id)
  }

  // Pass 1: Place prefer-alone students in isolated seats
  const preferAloneStudents = arrangedStudents.filter((s) => s.preferences.preferAlone)

  for (const student of preferAloneStudents) {
    const bestSeat = findBestSeat(student)
    if (bestSeat) {
      assignStudentToSeat(student, bestSeat)
    }
  }

  // Pass 2: Place valid mutual pairs together
  const processedPairs = new Set<string>()

  for (const student of arrangedStudents) {
    if (student.assignedSeatId) continue
    if (student.preferences.preferAlone) continue
    if (student.preferences.wantToSitWith.length === 0) continue

    for (const friendId of student.preferences.wantToSitWith) {
      const pairKey = [Math.min(student.id, friendId), Math.max(student.id, friendId)].join('-')
      if (processedPairs.has(pairKey)) continue

      // Check if this is a valid mutual pair
      if (!isValidMutualPair(student.id, friendId)) continue

      const friend = arrangedStudents.find((s) => s.id === friendId)
      if (!friend || friend.assignedSeatId) continue

      // Find all available adjacent seat pairs
      let bestPair: [Seat, Seat] | null = null
      let bestScore = -Infinity

      for (const seatId of availableSeats) {
        const seat1 = getSeatById(seatId)
        if (!seat1) continue

        const adjacentSeats = getAdjacentSeats(seat1, seats)
        for (const adjacentId of adjacentSeats) {
          if (!availableSeats.has(adjacentId)) continue

          const seat2 = getSeatById(adjacentId)
          if (!seat2) continue

          if (seat1.isDouble && seat1.pairedWith && seat1.pairedWith !== seat2.id) continue
          if (seat2.isDouble && seat2.pairedWith && seat2.pairedWith !== seat1.id) continue

          const seenKey = [seat1.id, seat2.id].sort().join('-')
          if (processedPairs.has(`seats-${seenKey}`)) continue

          let score = 200

          // Prefer double desks for paired students
          if (seat1.isDouble || seat2.isDouble) score += 30

          const seat1Neighbors = getNeighborSeats(seat1, seats).filter((id) => id !== seat2.id)
          const seat2Neighbors = getNeighborSeats(seat2, seats).filter((id) => id !== seat1.id)

          for (const nId of [...seat1Neighbors, ...seat2Neighbors]) {
            const nStudent = getAssignedStudent(nId)
            if (nStudent) {
              if (student.preferences.notWantToSitWith.includes(nStudent.id)) score -= 150
              if (friend.preferences.notWantToSitWith.includes(nStudent.id)) score -= 150
            }
          }

          if (score > bestScore) {
            bestScore = score
            bestPair = [seat1, seat2]
          }
        }
      }

      if (bestPair) {
        assignStudentToSeat(student, bestPair[0])
        assignStudentToSeat(friend, bestPair[1])
        processedPairs.add(pairKey)
        processedPairs.add(`seats-${[bestPair[0].id, bestPair[1].id].sort().join('-')}`)
        break
      }
    }
  }

  // Pass 3: Handle one-way preferences - place student next to already-seated friend (if friend allows)
  const studentsWithOneWayPrefs = arrangedStudents.filter(
    (s) => !s.assignedSeatId && s.preferences.wantToSitWith.length > 0 && !s.preferences.preferAlone,
  )

  for (const student of studentsWithOneWayPrefs) {
    if (student.assignedSeatId) continue

    for (const friendId of student.preferences.wantToSitWith) {
      // Skip if the friend blocks this pairing
      if (isPairingBlockedByFriend(student.id, friendId)) continue

      const friend = arrangedStudents.find((s) => s.id === friendId && s.assignedSeatId)
      if (!friend || !friend.assignedSeatId) continue

      const friendSeat = getSeatById(friend.assignedSeatId)
      if (!friendSeat) continue

      // Find adjacent available seat next to friend
      const sideSeats = getAdjacentSeats(friendSeat, seats)
      let bestSeat: Seat | null = null
      let bestScore = -Infinity

      for (const sideId of sideSeats) {
        if (!availableSeats.has(sideId)) continue

        const sideSeat = getSeatById(sideId)
        if (!sideSeat) continue

        let score = 150

        const neighbors = getNeighborSeats(sideSeat, seats).filter((id) => id !== friendSeat.id)
        for (const nId of neighbors) {
          const nStudent = getAssignedStudent(nId)
          if (nStudent && student.preferences.notWantToSitWith.includes(nStudent.id)) score -= 150
        }

        if (score > bestScore) {
          bestScore = score
          bestSeat = sideSeat
        }
      }

      if (bestSeat) {
        assignStudentToSeat(student, bestSeat)
        break
      }
    }

    // If still unassigned, try to pair with another unassigned student (if no blocking)
    if (!student.assignedSeatId) {
      const unassignedNoPref = arrangedStudents.find(
        (s) =>
          !s.assignedSeatId &&
          s.id !== student.id &&
          !s.preferences.preferAlone &&
          s.preferences.wantToSitWith.length === 0 &&
          !s.preferences.notWantToSitWith.includes(student.id) &&
          !student.preferences.notWantToSitWith.includes(s.id),
      )

      if (unassignedNoPref) {
        let bestPair: [Seat, Seat] | null = null
        let bestScore = -Infinity

        for (const seatId of availableSeats) {
          const seat1 = getSeatById(seatId)
          if (!seat1) continue

          const adjacentSeats = getAdjacentSeats(seat1, seats)
          for (const adjacentId of adjacentSeats) {
            if (!availableSeats.has(adjacentId)) continue

            const seat2 = getSeatById(adjacentId)
            if (!seat2) continue

            if (seat1.isDouble && seat1.pairedWith && seat1.pairedWith !== seat2.id) continue
            if (seat2.isDouble && seat2.pairedWith && seat2.pairedWith !== seat1.id) continue

            let score = 100

            const seat1Neighbors = getNeighborSeats(seat1, seats).filter((id) => id !== seat2.id)
            for (const nId of seat1Neighbors) {
              const nStudent = getAssignedStudent(nId)
              if (nStudent && student.preferences.notWantToSitWith.includes(nStudent.id)) score -= 150
            }

            if (score > bestScore) {
              bestScore = score
              bestPair = [seat1, seat2]
            }
          }
        }

        if (bestPair) {
          assignStudentToSeat(student, bestPair[0])
          assignStudentToSeat(unassignedNoPref, bestPair[1])
        }
      }
    }
  }

  // Pass 4: Assign remaining students — try to pair those who still want to sit with someone (if valid)
  const remainingUnassigned = arrangedStudents.filter(
    (s) => !s.assignedSeatId && !s.preferences.preferAlone,
  )

  // Sort: students WITHOUT wants first (they're easier to place), then those with wants
  remainingUnassigned.sort((a, b) => {
    const aWantsSomeone = a.preferences.wantToSitWith.length > 0 ? 1 : 0
    const bWantsSomeone = b.preferences.wantToSitWith.length > 0 ? 1 : 0
    return aWantsSomeone - bWantsSomeone
  })

  // Try to pair remaining students who have mutual wants (and aren't blocked)
  const pairedInThisPass = new Set<number>()

  for (let i = 0; i < remainingUnassigned.length; i++) {
    const student = remainingUnassigned[i]
    if (student.assignedSeatId || pairedInThisPass.has(student.id)) continue

    // Try to find a mutual partner first (only if student has wants)
    if (student.preferences.wantToSitWith.length > 0) {
      let partner: Student | null = null
      for (const friendId of student.preferences.wantToSitWith) {
        const potentialPartner = remainingUnassigned.find((s) => s.id === friendId && !s.assignedSeatId && !pairedInThisPass.has(s.id))
        if (potentialPartner && isValidMutualPair(student.id, friendId)) {
          partner = potentialPartner
          break
        }
      }

      if (partner) {
        // Find adjacent seats for the pair
        let bestPair: [Seat, Seat] | null = null
        let bestScore = -Infinity

        for (const seatId of availableSeats) {
          const seat1 = getSeatById(seatId)
          if (!seat1) continue

          const adjacentSeats = getAdjacentSeats(seat1, seats)
          for (const adjacentId of adjacentSeats) {
            if (!availableSeats.has(adjacentId)) continue

            const seat2 = getSeatById(adjacentId)
            if (!seat2) continue

            if (seat1.isDouble && seat1.pairedWith && seat1.pairedWith !== seat2.id) continue
            if (seat2.isDouble && seat2.pairedWith && seat2.pairedWith !== seat1.id) continue

            let score = 50

            if (score > bestScore) {
              bestScore = score
              bestPair = [seat1, seat2]
            }
          }
        }

        if (bestPair) {
          assignStudentToSeat(student, bestPair[0])
          assignStudentToSeat(partner, bestPair[1])
          pairedInThisPass.add(student.id)
          pairedInThisPass.add(partner.id)
          continue
        }
      }
    }

    // If no partner found (or student has no wants), assign single seat
    // BUT skip students who have unfulfilled mutual wants — they should stay unassigned
    if (!student.assignedSeatId && !pairedInThisPass.has(student.id)) {
      const hasUnfulfilledMutualWant = student.preferences.wantToSitWith.some((friendId) => {
        const friend = arrangedStudents.find((s) => s.id === friendId)
        return friend && !friend.assignedSeatId && friend.preferences.wantToSitWith.includes(student.id)
      })

      // Don't assign solo if they're waiting for a mutual partner
      if (!hasUnfulfilledMutualWant) {
        const bestSeat = findBestSeat(student)
        if (bestSeat) {
          assignStudentToSeat(student, bestSeat)
        }
      }
    }
  }

  // Pass 5: Final pass — assign any still-unassigned students who don't require pairing
  for (const student of arrangedStudents) {
    if (!student.assignedSeatId && availableSeats.size > 0) {
      // Check if student has unfulfilled mutual wants (don't force solo assignment)
      const hasUnfulfilledMutualWant = student.preferences.wantToSitWith.some((friendId) => {
        const friend = arrangedStudents.find((s) => s.id === friendId)
        return friend && !friend.assignedSeatId && friend.preferences.wantToSitWith.includes(student.id)
      })

      // Only assign if they don't have an unfulfilled mutual want
      if (!hasUnfulfilledMutualWant) {
        const bestSeat = findBestSeat(student)
        if (bestSeat) {
          assignStudentToSeat(student, bestSeat)
        }
      }
    }
  }

  return arrangedStudents
}
