import test from 'node:test'
import assert from 'node:assert/strict'

import {
  arrangeSeats,
  generateDefaultSeats,
  generateDefaultStudents,
  getNeighborSeats,
} from '../src/lib/seat-arrangement.ts'

const makeStudent = (id, overrides = {}) => ({
  ...generateDefaultStudents(1)[0],
  ...overrides,
  id,
  name: overrides.name ?? `Student ${id}`,
  preferences: {
    ...generateDefaultStudents(1)[0].preferences,
    ...(overrides.preferences ?? {}),
  },
})

const seatById = (students, seatId) => students.find((student) => student.assignedSeatId === seatId)

test('generateDefaultSeats builds a compact grid without gaps or negative coordinates', () => {
  const seats = generateDefaultSeats(7)

  assert.equal(seats.length, 7)
  assert.ok(seats.every((seat) => seat.row >= 0 && seat.col >= 0))

  const rows = new Set(seats.map((seat) => seat.row))
  const cols = new Set(seats.map((seat) => seat.col))
  assert.deepEqual([...rows], [0, 1, 2])
  assert.deepEqual([...cols], [0, 1, 2])
})

test('mutual sit-together preferences land in adjacent seats', () => {
  const seats = generateDefaultSeats(4)
  const students = [
    makeStudent(1, { preferences: { wantToSitWith: [2] } }),
    makeStudent(2, { preferences: { wantToSitWith: [1] } }),
    makeStudent(3),
    makeStudent(4),
  ]

  const arranged = arrangeSeats(students, seats)
  const student1 = arranged.find((student) => student.id === 1)
  const student2 = arranged.find((student) => student.id === 2)

  assert.ok(student1?.assignedSeatId)
  assert.ok(student2?.assignedSeatId)

  const seat1 = seats.find((seat) => seat.id === student1.assignedSeatId)
  const seat2 = seats.find((seat) => seat.id === student2.assignedSeatId)

  assert.ok(seat1)
  assert.ok(seat2)
  assert.equal(seat1.row, seat2.row)
  assert.equal(Math.abs(seat1.col - seat2.col), 1)
})

test('prefer-alone students choose the most isolated available seat', () => {
  const seats = [
    { id: 'left', row: 0, col: 0, isDouble: false },
    { id: 'right', row: 0, col: 1, isDouble: false },
    { id: 'isolated', row: 2, col: 0, isDouble: false },
  ]

  const students = [
    makeStudent(1, { preferences: { preferAlone: true } }),
    makeStudent(2),
    makeStudent(3),
  ]

  const arranged = arrangeSeats(students, seats)
  const preferAloneStudent = arranged.find((student) => student.id === 1)

  assert.equal(preferAloneStudent?.assignedSeatId, 'isolated')
})

test('one-way sit-together preferences get paired when a friend is available', () => {
  const seats = generateDefaultSeats(4)
  const students = [
    makeStudent(1, { preferences: { wantToSitWith: [2] } }),
    makeStudent(2),
    makeStudent(3),
    makeStudent(4),
  ]

  const arranged = arrangeSeats(students, seats)
  const student1 = arranged.find((student) => student.id === 1)
  const student2 = arranged.find((student) => student.id === 2)

  assert.ok(student1?.assignedSeatId)
  assert.ok(student2?.assignedSeatId)

  const seat1 = seats.find((seat) => seat.id === student1.assignedSeatId)
  const seat2 = seats.find((seat) => seat.id === student2.assignedSeatId)

  assert.ok(seat1)
  assert.ok(seat2)
  assert.equal(seat1.row, seat2.row)
  assert.equal(Math.abs(seat1.col - seat2.col), 1)
})

test('students who require a partner are left unassigned if no side-by-side seats exist', () => {
  const seats = [
    { id: 'a', row: 0, col: 0, isDouble: false },
    { id: 'b', row: 1, col: 2, isDouble: false },
    { id: 'c', row: 3, col: 0, isDouble: false },
  ]

  const students = [
    makeStudent(1, { preferences: { wantToSitWith: [2] } }),
    makeStudent(2, { preferences: { wantToSitWith: [1] } }),
    makeStudent(3),
  ]

  const arranged = arrangeSeats(students, seats)

  assert.equal(seatById(arranged, 'a')?.id, 3)
  assert.equal(arranged.find((student) => student.id === 1)?.assignedSeatId, undefined)
  assert.equal(arranged.find((student) => student.id === 2)?.assignedSeatId, undefined)
})

test('neighbor helper only includes orthogonal adjacent seats', () => {
  const seats = [
    { id: 'center', row: 1, col: 1, isDouble: false },
    { id: 'up', row: 0, col: 1, isDouble: false },
    { id: 'down', row: 2, col: 1, isDouble: false },
    { id: 'left', row: 1, col: 0, isDouble: false },
    { id: 'right', row: 1, col: 2, isDouble: false },
    { id: 'diag', row: 0, col: 0, isDouble: false },
  ]

  assert.deepEqual(getNeighborSeats(seats[0], seats).sort(), ['down', 'left', 'right', 'up'])
})
