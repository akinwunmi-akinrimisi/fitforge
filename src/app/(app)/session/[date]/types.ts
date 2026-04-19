export type SetLogRow = {
  id: string
  session_exercise_id: string
  set_number: number
  weight_kg: number | null
  reps: number
  rpe: number | null
  notes: string | null
  logged_at: string
}

export type CardioLogRow = {
  id: string
  modality: string
  duration_seconds: number
  distance_m: number | null
  avg_hr: number | null
  rpe: number
  notes: string | null
}

export type SessionLogRow = {
  id: string
  started_at: string
  ended_at: string | null
  overall_rpe: number | null
  notes: string | null
}

export type CardioBlockJson = {
  modality:
    | 'treadmill'
    | 'bike'
    | 'rower'
    | 'sled'
    | 'assault_bike'
    | 'outdoor_walk'
    | 'outdoor_run'
  kind: 'steady_state' | 'intervals' | 'complex'
  prescription: string
  targetRpe: number | null
  targetDurationMinutes: number | null
} | null

export type WarmupBlockJson = {
  durationMinutes: number
  exerciseSlugs: string[]
  mandatory: boolean
} | null

export type MobilityBlockJson = {
  durationMinutes: number
  exerciseSlugs: string[]
} | null

export type ExerciseLibraryRow = {
  slug: string
  name: string
  category: string
  gif_url: string | null
  posture_cues: string[]
  benefits: {
    physiological?: string[]
    aesthetic?: string[]
    functional?: string[]
  }
  movement_steps: Array<{ phase: string; instruction: string }>
  safety_warnings: string[]
  contraindications: string[]
  body_changes_to_watch: {
    green_flags?: string[]
    red_flags?: string[]
  }
  common_mistakes: Array<{ mistake: string; correction: string }>
  progression_slug: string | null
  regression_slug: string | null
  primary_muscles: string[]
  secondary_muscles: string[]
  equipment: string[]
}

export type ExerciseCardData = {
  id: string
  ord: number
  slug: string
  targetSets: number
  targetRepsMin: number
  targetRepsMax: number
  targetLoadKg: number | null
  restSeconds: number
  tempo: string | null
  notes: string | null
  library: ExerciseLibraryRow | null
  previousDefault: { weightKg: number | null; reps: number } | null
  setLogs: SetLogRow[]
}

export type SessionViewData = {
  date: string
  dateLabel: string
  phase: string
  weekNumber: number
  isDeload: boolean
  session: {
    id: string
    dayNumber: number
    type: string
    name: string
    warmup: WarmupBlockJson
    mobility: MobilityBlockJson
    cardio: CardioBlockJson
    redFlagVolumeCap: number | null
    redFlagReason: string | null
  }
  exercises: ExerciseCardData[]
  cardioLog: CardioLogRow | null
  sessionLog: SessionLogRow | null
}
