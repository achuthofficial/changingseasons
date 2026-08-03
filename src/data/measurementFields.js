// Mirrors the boutique's paper measurement sheet, used for every garment type.
export const measurementFields = [
  { key: 'blouseLength', label: 'Blouse length' },
  { key: 'shoulder', label: 'Shoulder' },
  { key: 'upperChest', label: 'Upper chest' },
  { key: 'middleChest', label: 'Middle chest' },
  { key: 'blouseWaist', label: 'Blouse waist' },
  { key: 'dotPoint', label: 'Dot point' },
  { key: 'handLength', label: 'Hand length' },
  { key: 'handLoose', label: 'Hand loose' },
  { key: 'armHole', label: 'Arm hole' },
  { key: 'frontDeep', label: 'Front deep' },
  { key: 'backDeep', label: 'Back deep' },
  { key: 'topLength', label: 'Top length' },
  { key: 'bottomLength', label: 'Bottom length' },
  { key: 'bottomLoose', label: 'Bottom loose' },
  { key: 'slit', label: 'Slit' },
  { key: 'hipPoint', label: 'Hip point' },
  { key: 'lehangaLength', label: 'Lehanga length' },
  { key: 'lehangaWaist', label: 'Lehanga waist' },
  { key: 'length', label: 'Length' },
  { key: 'chest', label: 'Chest' },
  { key: 'waist', label: 'Waist' },
  { key: 'stomach', label: 'Stomach' },
  { key: 'sleeveLength', label: 'Sleeve length' },
  { key: 'sleeveRound', label: 'Sleeve round' },
  { key: 'bicep', label: 'Bicep' },
  { key: 'armRound', label: 'Arm round' },
  { key: 'collar', label: 'Collar' },
  { key: 'frontCross', label: 'Front cross' },
  { key: 'backCross', label: 'Back cross' },
  { key: 'dhotiLength', label: 'Dhoti length' },
  { key: 'pantLength', label: 'Pant length' },
  { key: 'ankle', label: 'Ankle' },
  { key: 'knee', label: 'Knee' },
  { key: 'thigh', label: 'Thigh' },
  { key: 'gear', label: 'Gear' },
  { key: 'bottomWaist', label: 'Bottom waist' },
  { key: 'fullSleeve', label: 'Full sleeve' },
  { key: 'sleeveLoose', label: 'Sleeve loose' },
  { key: 'sleeveLooseShort', label: 'Sleeve loose short' },
  { key: 'sleeveLooseElbow', label: 'Sleeve loose elbow' },
  { key: 'sleeveLoose34', label: 'Sleeve loose 3/4th' },
]

// Top & Bottom, Frock, and Anarkali all use this same measurement set.
const topBottomFrockAnarkaliKeys = [
  'topLength',
  'frontDeep',
  'backDeep',
  'slit',
  'hipPoint',
  'gear',
  'bottomLength',
  'bottomLoose',
  'bottomWaist',
  'ankle',
  'knee',
  'thigh',
  'upperChest',
  'chest',
  'waist',
  'shoulder',
  'armRound',
  'sleeveLength',
  'fullSleeve',
  'sleeveLoose',
  'sleeveLooseShort',
  'sleeveLooseElbow',
  'sleeveLoose34',
]

// Which of the fields above are relevant for a given garment type, so the
// order form only shows fields that actually apply instead of the full
// generic list for every garment. A garment type with no entry here still
// shows every field (safe default) until its own subset is defined.
export const measurementFieldsByGarment = {
  Lehenga: ['lehangaLength', 'lehangaWaist', 'hipPoint'],
  'Men Kurta': [
    'length',
    'shoulder',
    'upperChest',
    'chest',
    'waist',
    'stomach',
    'hipPoint',
    'sleeveLength',
    'sleeveRound',
    'bicep',
    'armRound',
    'collar',
    'frontCross',
    'backCross',
  ],
  'Dohti / Pant': ['dhotiLength', 'pantLength', 'ankle', 'knee', 'thigh', 'waist', 'hipPoint'],
  'Top & Bottom': topBottomFrockAnarkaliKeys,
  Frock: topBottomFrockAnarkaliKeys,
  Anarkali: topBottomFrockAnarkaliKeys,
}

const fieldsByKey = new Map(measurementFields.map((f) => [f.key, f]))

export function measurementFieldsFor(garmentType) {
  const keys = measurementFieldsByGarment[garmentType]
  if (!keys) return measurementFields
  // Preserves the order given in measurementFieldsByGarment (not the master
  // list's order), so e.g. Men Kurta shows Length first, then Shoulder, etc.
  return keys.map((k) => fieldsByKey.get(k)).filter(Boolean)
}
