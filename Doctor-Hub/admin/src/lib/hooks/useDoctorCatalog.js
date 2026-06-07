import { useCallback, useEffect, useState } from 'react'

const DEFAULT_CATALOG = {
  specialities: [],
  treatmentTypes: [],
  diseases: [],
}

export function useDoctorCatalog({ apiBase, token, adminCatalog = false }) {
  const [catalog, setCatalog] = useState(DEFAULT_CATALOG)
  const [loading, setLoading] = useState(true)

  const fetchCatalog = useCallback(async () => {
    if (!apiBase) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const url = `${apiBase.replace(/\/$/, '')}/doctors/catalog`
      const res = await fetch(url)
      const data = await res.json()
      if (data?.catalog) setCatalog(data.catalog)
    } catch {
      /* keep defaults */
    } finally {
      setLoading(false)
    }
  }, [apiBase])

  useEffect(() => {
    fetchCatalog()
  }, [fetchCatalog])

  const addCatalogEntry = useCallback(
    async (type, value, label) => {
      if (!adminCatalog || !apiBase || !token) return fetchCatalog()
      const base = apiBase.replace(/\/$/, '')
      const res = await fetch(`${base}/admin/catalog`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          token,
          atoken: token,
        },
        body: JSON.stringify({ type, value, label }),
      })
      const data = await res.json()
      if (data?.catalog) setCatalog(data.catalog)
      return data
    },
    [adminCatalog, apiBase, token, fetchCatalog]
  )

  return {
    catalog,
    loading,
    refreshCatalog: fetchCatalog,
    addSpeciality: (v) => addCatalogEntry('speciality', v),
    addTreatmentType: (v, label) => addCatalogEntry('treatment_type', v, label),
    addDisease: (v) => addCatalogEntry('disease', v),
  }
}
