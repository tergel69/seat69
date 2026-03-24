'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Users, 
  Grid3X3, 
  Settings2, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  Plus, 
  Trash2, 
  UserPlus,
  UserX,
  UserCircle,
  Check,
  RotateCcw,
  Eye,
  GripVertical
} from 'lucide-react'

import {
  arrangeSeats,
  getNeighborSeats,
  generateDefaultSeats,
  generateDefaultStudents,
  type Seat,
  type Student,
} from '@/lib/seat-arrangement'

interface AppState {
  step: 'setup' | 'layout' | 'preferences' | 'arrangement' | 'result'
  numStudents: number
  students: Student[]
  seats: Seat[]
  currentStudentIndex: number
}

const positionColors = {
  front: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700',
  middle: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700',
  back: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-700',
  any: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800/30 dark:text-gray-400 dark:border-gray-600',
}

export default function ClassroomSeatArranger() {
  const [state, setState] = useState<AppState>({
    step: 'setup',
    numStudents: 20,
    students: [],
    seats: [],
    currentStudentIndex: 0
  })
  
  const [draggedSeatId, setDraggedSeatId] = useState<string | null>(null)
  
  // Step navigation
  const goToStep = (step: AppState['step']) => {
    setState(prev => ({ ...prev, step }))
  }
  
  // Setup handlers
  const handleNumStudentsChange = (value: string) => {
    const num = parseInt(value) || 0
    setState(prev => ({ ...prev, numStudents: Math.max(1, Math.min(50, num)) }))
  }
  
  const initializeClass = () => {
    const students = generateDefaultStudents(state.numStudents)
    const seats = generateDefaultSeats(state.numStudents)
    setState(prev => ({ ...prev, students, seats, step: 'layout', currentStudentIndex: 0 }))
  }

  // Layout handlers
  const addSeat = () => {
    const maxRow = state.seats.length > 0 ? Math.max(...state.seats.map(s => s.row)) : -1
    const maxCol = maxRow >= 0 ? state.seats.filter(s => s.row === maxRow).length : 0
    const cols = Math.max(6, Math.ceil(Math.sqrt(state.students.length + 1)))
    
    const newSeat: Seat = {
      id: `seat-${Date.now()}`,
      row: maxRow < 0 || maxCol >= cols ? maxRow + 1 : maxRow,
      col: maxRow < 0 || maxCol >= cols ? 0 : maxCol,
      isDouble: false
    }
    
    setState(prev => ({ ...prev, seats: [...prev.seats, newSeat] }))
  }

  const deleteSeat = (seatId: string) => {
    setState(prev => ({
      ...prev,
      seats: prev.seats
        .filter(s => s.id !== seatId)
        .map(s => {
          if (s.pairedWith === seatId) {
            return { ...s, isDouble: false, pairedWith: undefined }
          }
          return s
        }),
      students: prev.students.map(s => 
        s.assignedSeatId === seatId ? { ...s, assignedSeatId: undefined } : s
      ),
    }))
  }
  
  const toggleDoubleSeat = (seatId: string) => {
    setState(prev => {
      const seat = prev.seats.find(s => s.id === seatId)
      if (!seat) return prev
      
      if (seat.isDouble && seat.pairedWith) {
        return {
          ...prev,
          seats: prev.seats.map(s => {
            if (s.id === seatId) return { ...s, isDouble: false, pairedWith: undefined }
            if (s.id === seat.pairedWith) return { ...s, isDouble: false, pairedWith: undefined }
            return s
          })
        }
      } else {
        const adjacentSeat = prev.seats.find(s => 
          s.id !== seatId && 
          s.row === seat.row && 
          Math.abs(s.col - seat.col) === 1 &&
          !s.isDouble
        )
        
        if (adjacentSeat) {
          return {
            ...prev,
            seats: prev.seats.map(s => {
              if (s.id === seatId) return { ...s, isDouble: true, pairedWith: adjacentSeat.id }
              if (s.id === adjacentSeat.id) return { ...s, isDouble: true, pairedWith: seatId }
              return s
            })
          }
        }
      }
      return prev
    })
  }
  
  const handleDropAtPosition = (targetRow: number, targetCol: number) => {
    if (!draggedSeatId) return
    
    setState(prev => {
      const draggedSeat = prev.seats.find(s => s.id === draggedSeatId)
      if (!draggedSeat) return prev
      
      const existingSeatAtTarget = prev.seats.find(s => s.row === targetRow && s.col === targetCol)
      
      if (existingSeatAtTarget && existingSeatAtTarget.id !== draggedSeatId) {
        return {
          ...prev,
          seats: prev.seats.map(s => {
            if (s.id === draggedSeatId) return { ...s, row: targetRow, col: targetCol }
            if (s.id === existingSeatAtTarget.id) return { ...s, row: draggedSeat.row, col: draggedSeat.col }
            return s
          })
        }
      } else if (!existingSeatAtTarget) {
        return {
          ...prev,
          seats: prev.seats.map(s => {
            if (s.id === draggedSeatId) return { ...s, row: targetRow, col: targetCol }
            return s
          })
        }
      }
      return prev
    })
    setDraggedSeatId(null)
  }
  
  const handleDragStart = (seatId: string) => {
    setDraggedSeatId(seatId)
  }
  
  const handleDragEnd = () => {
    setDraggedSeatId(null)
  }
  
  // Preference handlers
  const updateStudentPreference = (
    studentId: number, 
    field: 'position' | 'wantToSitWith' | 'notWantToSitWith' | 'preferAlone',
    value: string | number[] | boolean
  ) => {
    setState(prev => ({
      ...prev,
      students: prev.students.map(s => {
        if (s.id === studentId) {
          return {
            ...s,
            preferences: {
              ...s.preferences,
              [field]: value
            }
          }
        }
        return s
      })
    }))
  }
  
  const updateStudentName = (studentId: number, name: string) => {
    setState(prev => ({
      ...prev,
      students: prev.students.map(s => 
        s.id === studentId ? { ...s, name } : s
      )
    }))
  }
  
  const nextStudent = () => {
    setState(prev => ({
      ...prev,
      currentStudentIndex: Math.min(prev.currentStudentIndex + 1, prev.students.length - 1)
    }))
  }
  
  const prevStudent = () => {
    setState(prev => ({
      ...prev,
      currentStudentIndex: Math.max(prev.currentStudentIndex - 1, 0)
    }))
  }
  
  // Arrangement
  const runArrangement = () => {
    const arrangedStudents = arrangeSeats(state.students, state.seats)
    setState(prev => ({ ...prev, students: arrangedStudents, step: 'result' }))
  }
  
  const resetArrangement = () => {
    setState(prev => ({
      ...prev,
      students: prev.students.map(s => ({ ...s, assignedSeatId: undefined })),
      step: 'arrangement'
    }))
  }
  
  // Calculate grid layout
  const { seatGrid } = useMemo(() => {
    const maxRow = Math.max(...state.seats.map(s => s.row), 0)
    const maxCol = Math.max(...state.seats.map(s => s.col), 0)
    
    const grid: (Seat | null)[][] = Array.from({ length: maxRow + 1 }, () =>
      Array(maxCol + 1).fill(null)
    )
    
    state.seats.forEach(seat => {
      if (grid[seat.row] && grid[seat.row][seat.col] === null) {
        grid[seat.row][seat.col] = seat
      }
    })
    
    return { seatGrid: grid }
  }, [state.seats])
  
  const currentStudent = state.students[state.currentStudentIndex]
  const otherStudents = state.students.filter(s => s.id !== currentStudent?.id)
  
  const renderProgressBar = () => {
    const steps = [
      { key: 'setup', label: 'Setup', icon: Users },
      { key: 'layout', label: 'Layout', icon: Grid3X3 },
      { key: 'preferences', label: 'Preferences', icon: Settings2 },
      { key: 'arrangement', label: 'Arrange', icon: Sparkles },
      { key: 'result', label: 'Result', icon: Check }
    ]
    
    const currentIndex = steps.findIndex(s => s.key === state.step)
    
    return (
      <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
        {steps.map((step, index) => {
          const Icon = step.icon
          const isActive = step.key === state.step
          const isCompleted = index < currentIndex
          
          return (
            <div key={step.key} className="flex items-center">
              <button
                onClick={() => isCompleted && goToStep(step.key as AppState['step'])}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                  isActive 
                    ? 'bg-primary text-primary-foreground shadow-lg scale-105' 
                    : isCompleted
                      ? 'bg-primary/20 text-primary cursor-pointer hover:bg-primary/30'
                      : 'bg-muted text-muted-foreground'
                }`}
                disabled={!isCompleted && !isActive}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline text-sm font-medium">{step.label}</span>
              </button>
              {index < steps.length - 1 && (
                <div className={`w-8 h-0.5 mx-1 ${index < currentIndex ? 'bg-primary' : 'bg-muted'}`} />
              )}
            </div>
          )
        })}
      </div>
    )
  }
  
  const renderSetup = () => (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Class Setup
        </CardTitle>
        <CardDescription>Enter the number of students in your class to get started</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="numStudents">Number of Students</Label>
          <Input
            id="numStudents"
            type="number"
            min={1}
            max={50}
            value={state.numStudents}
            onChange={(e) => handleNumStudentsChange(e.target.value)}
            className="text-lg"
          />
          <p className="text-sm text-muted-foreground">Recommended: 10-40 students for best results</p>
        </div>
        
        <Button onClick={initializeClass} className="w-full" size="lg">
          Create Classroom
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  )
  
  const renderLayout = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Grid3X3 className="h-5 w-5" />
            Seat Layout
          </CardTitle>
          <CardDescription>
            Customize your classroom layout. Drag seats to move them, click to create double desks, use X to delete.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4 flex-wrap">
            <Button onClick={addSeat} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1" /> Add Seat
            </Button>
            <Button onClick={() => setState(prev => ({
              ...prev,
              seats: generateDefaultSeats(state.students.length),
              students: prev.students.map(s => ({ ...s, assignedSeatId: undefined }))
            }))} variant="outline" size="sm">
              <RotateCcw className="h-4 w-4 mr-1" /> Reset Layout
            </Button>
          </div>
          
          <div className="border rounded-lg p-4 bg-muted/30 overflow-x-auto">
            <div className="text-center mb-4 text-sm text-muted-foreground font-medium">
              📝 FRONT OF CLASSROOM
            </div>
            
            <div className="flex flex-col gap-2 items-center min-w-max">
              {seatGrid.map((row, rowIndex) => (
                <div key={rowIndex} className="flex gap-2">
                  {row.map((seat, colIndex) => {
                    if (!seat) {
                      return (
                        <div
                          key={`empty-${rowIndex}-${colIndex}`}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => handleDropAtPosition(rowIndex, colIndex)}
                          className={`w-14 h-14 rounded-lg border-2 border-dashed flex items-center justify-center transition-all ${
                            draggedSeatId ? 'border-primary/50 bg-primary/5 hover:border-primary hover:bg-primary/10' : 'border-transparent'
                          }`}
                        >
                          {draggedSeatId && <div className="text-xs text-muted-foreground">+</div>}
                        </div>
                      )
                    }
                    
                    const isBeingDragged = draggedSeatId === seat.id
                    const isDouble = seat.isDouble
                    
                    return (
                      <div key={seat.id} className="relative group" onDragOver={(e) => e.preventDefault()} onDrop={() => handleDropAtPosition(seat.row, seat.col)}>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteSeat(seat.id) }}
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-red-600 shadow-sm"
                          title="Delete seat"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                        
                        <div
                          draggable
                          onDragStart={() => handleDragStart(seat.id)}
                          onDragEnd={handleDragEnd}
                          onClick={() => toggleDoubleSeat(seat.id)}
                          className={`w-14 h-14 rounded-lg flex flex-col items-center justify-center cursor-grab transition-all duration-200 select-none ${
                            isBeingDragged ? 'opacity-30 scale-95 cursor-grabbing' : 'hover:scale-105 cursor-grab active:cursor-grabbing'
                          } ${isDouble ? 'bg-primary/20 border-2 border-primary shadow-md' : 'bg-card border border-border hover:border-primary/50'}`}
                          title={`Row ${seat.row + 1}, Col ${seat.col + 1}${isDouble ? ' (Double Desk - click to unpair)' : ' (Click to pair)'}`}
                        >
                          <GripVertical className="h-3 w-3 text-muted-foreground mb-1" />
                          {isDouble ? (
                            <div className="flex gap-0.5">
                              <div className="w-3 h-3 rounded-sm bg-primary/60" />
                              <div className="w-3 h-3 rounded-sm bg-primary/60" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-sm bg-muted-foreground/30" />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex gap-4 mt-4 text-sm text-muted-foreground flex-wrap">
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-card border" /> Single Seat</div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-primary/20 border-2 border-primary" /> Double Desk</div>
            <div className="flex items-center gap-2"><GripVertical className="h-4 w-4" /> Drag to move</div>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => goToStep('setup')}><ChevronLeft className="h-4 w-4 mr-2" /> Back</Button>
        <Button onClick={() => goToStep('preferences')}>Next: Set Preferences<ChevronRight className="h-4 w-4 ml-2" /></Button>
      </div>
    </div>
  )
  
  const renderPreferences = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5" /> Student Preferences</CardTitle>
          <CardDescription>Students with preferences will ALWAYS be seated in double desks (side-by-side with their friend).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Progress</span>
              <span className="text-sm font-medium">{state.currentStudentIndex + 1} of {state.students.length}</span>
            </div>
            <Progress value={((state.currentStudentIndex + 1) / state.students.length) * 100} className="h-2" />
          </div>
          
          {currentStudent && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">{currentStudent.id}</div>
                <div className="flex-1">
                  <Input value={currentStudent.name} onChange={(e) => updateStudentName(currentStudent.id, e.target.value)} className="text-lg font-medium" placeholder="Student name" />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 rounded-lg border-2 border-dashed border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <Checkbox
                      checked={currentStudent.preferences.preferAlone}
                      onCheckedChange={(checked) => {
                        updateStudentPreference(currentStudent.id, 'preferAlone', checked === true)
                        if (checked === true) updateStudentPreference(currentStudent.id, 'wantToSitWith', [])
                      }}
                    />
                    <div className="flex items-center gap-2">
                      <UserCircle className="h-5 w-5 text-purple-500" />
                      <div>
                        <span className="font-medium text-purple-700 dark:text-purple-400">Prefer to sit alone</span>
                        <p className="text-xs text-muted-foreground">Will be placed in an isolated single seat</p>
                      </div>
                    </div>
                  </label>
                </div>
                
                <div className="space-y-2">
                  <Label>Position Preference</Label>
                  <Select value={currentStudent.preferences.position} onValueChange={(value) => updateStudentPreference(currentStudent.id, 'position', value)}>
                    <SelectTrigger><SelectValue placeholder="Select position" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">No Preference</SelectItem>
                      <SelectItem value="front">Front of Class</SelectItem>
                      <SelectItem value="middle">Middle of Class</SelectItem>
                      <SelectItem value="back">Back of Class</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {!currentStudent.preferences.preferAlone && (
                  <>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><UserPlus className="h-4 w-4 text-emerald-500" /> Want to sit with (Select each other for double desk!)</Label>
                      <ScrollArea className="h-32 rounded-md border p-2">
                        <div className="space-y-2">
                          {otherStudents.map(student => {
                            const isMutual = student.preferences.wantToSitWith.includes(currentStudent.id)
                            const friendWantsAlone = student.preferences.preferAlone
                            return (
                              <label key={student.id} className={`flex items-center gap-2 cursor-pointer p-1.5 rounded ${isMutual ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'hover:bg-muted/50'} ${friendWantsAlone ? 'opacity-50' : ''}`}>
                                <Checkbox
                                  checked={currentStudent.preferences.wantToSitWith.includes(student.id)}
                                  disabled={friendWantsAlone}
                                  onCheckedChange={(checked) => {
                                    const newValue = checked ? [...currentStudent.preferences.wantToSitWith, student.id] : currentStudent.preferences.wantToSitWith.filter(id => id !== student.id)
                                    updateStudentPreference(currentStudent.id, 'wantToSitWith', newValue)
                                  }}
                                />
                                <span className="text-sm">{student.name}</span>
                                {isMutual && <Badge variant="outline" className="text-xs bg-emerald-100 text-emerald-700 border-emerald-300 ml-auto">Mutual! 🪑🪑</Badge>}
                                {friendWantsAlone && <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700 border-purple-300 ml-auto">Wants alone</Badge>}
                              </label>
                            )
                          })}
                        </div>
                      </ScrollArea>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><UserX className="h-4 w-4 text-red-500" /> Prefer NOT to sit with</Label>
                      <ScrollArea className="h-32 rounded-md border p-2">
                        <div className="space-y-2">
                          {otherStudents.map(student => (
                            <label key={student.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1.5 rounded">
                              <Checkbox
                                checked={currentStudent.preferences.notWantToSitWith.includes(student.id)}
                                onCheckedChange={(checked) => {
                                  const newValue = checked ? [...currentStudent.preferences.notWantToSitWith, student.id] : currentStudent.preferences.notWantToSitWith.filter(id => id !== student.id)
                                  updateStudentPreference(currentStudent.id, 'notWantToSitWith', newValue)
                                }}
                              />
                              <span className="text-sm">{student.name}</span>
                            </label>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </>
                )}
              </div>
              
              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={prevStudent} disabled={state.currentStudentIndex === 0}><ChevronLeft className="h-4 w-4 mr-2" /> Previous</Button>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setState(prev => ({ ...prev, currentStudentIndex: prev.currentStudentIndex + 1 }))} disabled={state.currentStudentIndex === state.students.length - 1}>Skip</Button>
                  <Button onClick={nextStudent}>{state.currentStudentIndex === state.students.length - 1 ? 'Finish' : 'Next'}<ChevronRight className="h-4 w-4 ml-2" /></Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => goToStep('layout')}><ChevronLeft className="h-4 w-4 mr-2" /> Back</Button>
        <Button onClick={() => goToStep('arrangement')}>Continue to Arrangement<ChevronRight className="h-4 w-4 ml-2" /></Button>
      </div>
    </div>
  )
  
  const renderArrangement = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5" /> Seat Arrangement</CardTitle>
          <CardDescription>Review preferences and run the auto-arrangement algorithm.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-muted/50"><div className="text-2xl font-bold text-primary">{state.students.length}</div><div className="text-sm text-muted-foreground">Students</div></div>
            <div className="p-4 rounded-lg bg-muted/50"><div className="text-2xl font-bold text-primary">{state.seats.length}</div><div className="text-sm text-muted-foreground">Seats</div></div>
            <div className="p-4 rounded-lg bg-muted/50"><div className="text-2xl font-bold text-primary">{state.students.filter(s => s.preferences.wantToSitWith.length > 0 || s.preferences.position !== 'any').length}</div><div className="text-sm text-muted-foreground">With Preferences</div></div>
            <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200"><div className="text-2xl font-bold text-purple-600">{state.students.filter(s => s.preferences.preferAlone).length}</div><div className="text-sm text-muted-foreground">Want Alone</div></div>
          </div>
          
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
            <p className="text-sm text-emerald-800 dark:text-emerald-400">
              💡 <strong>Important:</strong> Students with "want to sit with" preferences will ALWAYS be seated in double desks (side-by-side). Students who want to be alone get isolated single seats.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Button onClick={runArrangement} className="flex-1" size="lg"><Sparkles className="h-4 w-4 mr-2" /> Auto-Arrange Seats</Button>
            <Button onClick={() => setState(prev => ({ ...prev, step: 'result' }))} variant="outline" className="flex-1" size="lg"><Eye className="h-4 w-4 mr-2" /> Preview Empty</Button>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-start">
        <Button variant="outline" onClick={() => goToStep('preferences')}><ChevronLeft className="h-4 w-4 mr-2" /> Back to Preferences</Button>
      </div>
    </div>
  )
  
  const renderResult = () => {
    const totalRows = Math.max(...state.seats.map(s => s.row), 0) + 1
    
    const getStudentForSeat = (seatId: string) => state.students.find(s => s.assignedSeatId === seatId)
    
    const getSeatPosition = (seat: Seat): 'front' | 'middle' | 'back' => {
      const third = totalRows / 3
      if (seat.row < third) return 'front'
      if (seat.row < third * 2) return 'middle'
      return 'back'
    }
    
    let assignedCount = 0
    let friendsTogether = 0
    
    state.students.forEach(student => {
      if (!student.assignedSeatId) return
      assignedCount++
      const seat = state.seats.find(s => s.id === student.assignedSeatId)
      if (!seat) return
      
      const neighbors = getNeighborSeats(seat, state.seats)
      for (const neighborId of neighbors) {
        const neighborStudent = getStudentForSeat(neighborId)
        if (neighborStudent && student.preferences.wantToSitWith.includes(neighborStudent.id)) {
          friendsTogether++
        }
      }
    })
    
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Check className="h-5 w-5 text-emerald-500" /> Final Arrangement</CardTitle>
            <CardDescription>Click on a seated student to remove them, or click an unassigned student below to place them.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-4 bg-muted/30 overflow-x-auto">
              <div className="text-center mb-4 text-sm text-muted-foreground font-medium">📝 FRONT OF CLASSROOM</div>
              
              <div className="flex flex-col gap-2 items-center min-w-max">
                {seatGrid.map((row, rowIndex) => (
                  <div key={rowIndex} className="flex gap-2">
                    {row.map((seat, colIndex) => {
                      if (!seat) return <div key={colIndex} className="w-20 h-16" />
                      
                      const student = getStudentForSeat(seat.id)
                      
                      return (
                        <div
                          key={seat.id}
                          onClick={() => {
                            if (student) {
                              setState(prev => ({
                                ...prev,
                                students: prev.students.map(s => s.assignedSeatId === seat.id ? { ...s, assignedSeatId: undefined } : s)
                              }))
                            }
                          }}
                          className={`w-20 h-16 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all duration-200 text-xs ${
                            student 
                              ? student.preferences.preferAlone
                                ? 'bg-purple-500 text-white shadow-md hover:shadow-lg hover:scale-105'
                                : 'bg-primary text-primary-foreground shadow-md hover:shadow-lg hover:scale-105'
                              : 'bg-card border border-dashed border-border hover:border-primary/50 hover:bg-muted/50'
                          } ${seat.isDouble ? 'ring-2 ring-primary/30' : ''}`}
                        >
                          {student ? (
                            <>
                              <div className="font-bold truncate px-1 w-full text-center flex items-center justify-center gap-1">
                                {student.preferences.preferAlone && <UserCircle className="h-3 w-3" />}
                                {student.name}
                              </div>
                              <div className={`text-[10px] px-1.5 py-0.5 rounded-full mt-1 ${student.preferences.preferAlone ? 'bg-purple-300 text-purple-900' : positionColors[student.preferences.position]}`}>
                                {student.preferences.preferAlone ? 'alone' : student.preferences.position}
                              </div>
                            </>
                          ) : (
                            <div className="text-muted-foreground">Empty</div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mt-6 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
              <h4 className="font-medium text-emerald-800 dark:text-emerald-400 mb-3">Arrangement Analysis</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div><span className="text-muted-foreground">Assigned:</span> <span className="font-medium">{assignedCount}/{state.students.length}</span></div>
                <div><span className="text-muted-foreground">Friends Together:</span> <span className="font-medium text-emerald-600">{friendsTogether} pairs</span></div>
              </div>
            </div>
            
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-primary" /> Seated</div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-purple-500" /> Alone</div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-card border border-dashed" /> Empty</div>
            </div>
            
            {state.students.some(s => !s.assignedSeatId) && (
              <div className="mt-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <h4 className="font-medium text-amber-800 dark:text-amber-400 mb-2">Unassigned Students (Click to assign)</h4>
                <div className="flex flex-wrap gap-2">
                  {state.students.filter(s => !s.assignedSeatId).map(s => (
                    <Badge
                      key={s.id}
                      variant="outline"
                      className={`cursor-pointer transition-colors ${s.preferences.preferAlone ? 'hover:bg-purple-500 hover:text-white' : 'hover:bg-primary hover:text-primary-foreground'}`}
                      onClick={() => {
                        const emptySeat = state.seats.find(seat => !state.students.some(st => st.assignedSeatId === seat.id))
                        if (emptySeat) {
                          setState(prev => ({
                            ...prev,
                            students: prev.students.map(st => st.id === s.id ? { ...st, assignedSeatId: emptySeat.id } : st)
                          }))
                        }
                      }}
                    >
                      {s.preferences.preferAlone && <UserCircle className="h-3 w-3 mr-1" />}
                      {s.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <div className="flex flex-wrap gap-4 justify-between">
          <Button variant="outline" onClick={() => goToStep('arrangement')}><ChevronLeft className="h-4 w-4 mr-2" /> Back</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={resetArrangement}><RotateCcw className="h-4 w-4 mr-2" /> Reset</Button>
            <Button onClick={runArrangement}><Sparkles className="h-4 w-4 mr-2" /> Re-Arrange</Button>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Classroom Seat Arranger</h1>
          <p className="text-muted-foreground mt-2">Create the perfect seating arrangement for your class</p>
        </div>
        
        {renderProgressBar()}
        
        <div className="min-h-[400px]">
          {state.step === 'setup' && renderSetup()}
          {state.step === 'layout' && renderLayout()}
          {state.step === 'preferences' && renderPreferences()}
          {state.step === 'arrangement' && renderArrangement()}
          {state.step === 'result' && renderResult()}
        </div>
      </div>
    </div>
  )
}
