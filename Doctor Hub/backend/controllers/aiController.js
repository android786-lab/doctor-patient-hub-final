const SYMPTOM_RULES = {
  fever: ['Viral Infection', 'Typhoid', 'Malaria'],
  headache: ['Migraine', 'Hypertension', 'Sinusitis'],
  cough: ['Common Cold', 'Bronchitis', 'Allergic Rhinitis'],
  'chest pain': ['Angina', 'GERD', 'Muscle Strain'],
  fatigue: ['Anemia', 'Thyroid Issue', 'Vitamin Deficiency'],
  nausea: ['Food Poisoning', 'Gastritis'],
  rash: ['Allergy', 'Eczema', 'Viral Rash'],
}

function ruleBasedPredict(symptoms) {
  const map = new Map()
  for (const s of symptoms) {
    const lower = s.toLowerCase()
    const key = Object.keys(SYMPTOM_RULES).find((k) => lower.includes(k))
    if (key) {
      for (const c of SYMPTOM_RULES[key]) {
        map.set(c, (map.get(c) ?? 0) + 0.25)
      }
    }
  }
  return [...map.entries()].map(([condition, confidence]) => ({
    condition,
    confidence: Math.min(confidence, 0.85),
    note: 'Rule-based triage (not a diagnosis)',
  }))
}

const predictDisease = async (req, res) => {
  try {
    const { symptoms } = req.body
    if (!Array.isArray(symptoms) || !symptoms.length) {
      return res.json({ success: false, message: 'Add at least one symptom' })
    }

    let predictions = ruleBasedPredict(symptoms)
    if (!predictions.length) {
      predictions = [
        {
          condition: 'General physician consultation',
          confidence: 0.5,
          note: 'No exact match — book a doctor',
        },
      ]
    }

    const userId = req.userId || req.body.userId
    if (userId) {
      const supabase = (await import('../config/supabaseClient.js')).default
      await supabase.from('ai_predictions').insert({
        user_id: userId,
        symptoms,
        predicted_conditions: predictions,
      })
    }

    res.json({
      success: true,
      data: {
        predictions,
        source: 'rule-based',
        disclaimer:
          'This is not a medical diagnosis. Please consult a qualified doctor.',
      },
    })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}

export { predictDisease }
