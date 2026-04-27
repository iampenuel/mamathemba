export type HandoffDraftRequest = {
  pregnancy_status: string
  postpartum_hours: number | null
  danger_signs: string[]
  transport_mode: string
  blood_pressure: string
  heart_rate: number
  interventions_given: string[]
  clinician_note: string
}

export type HandoffDraftResponse = {
  draft: string
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

export async function generateHandoffDraft(
  payload: HandoffDraftRequest
): Promise<HandoffDraftResponse> {
  if (!API_BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not set.")
  }

  const res = await fetch(`${API_BASE_URL}/api/handoff/draft`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data?.detail || "Failed to generate handoff draft.")
  }

  return data
}