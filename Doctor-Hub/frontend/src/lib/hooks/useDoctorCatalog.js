import { useCallback, useEffect, useState } from 'react'

const DEFAULT_CATALOG = {
  specialities: [],
  treatmentTypes: [],
  diseases: [],
}

const CACHE_TTL_MS = 5 * 60 * 1000
let catalogCache = { apiBase: null, catalog: null, fetchedAt: 0 }

export function useDoctorCatalog({ apiBase, token, adminCatalog = false }) {
  const [catalog, setCatalog] = useState(() => {
    if (catalogCache.apiBase === apiBase && catalogCache.catalog && Date.now() - catalogCache.fetchedAt < CACHE_TTL_MS) {
      return catalogCache.catalog
    }
    return DEFAULT_CATALOG
  })
  const [loading, setLoading] = useState(() => {
    if (catalogCache.apiBase === apiBase && catalogCache.catalog && Date.now() - catalogCache.fetchedAt < CACHE_TTL_MS) {
      return false
    }
    return true
  })

  const fetchCatalog = useCallback(async (force = false) => {
    if (!apiBase) {
      setLoading(false)
      return
    }
    if (
      !force &&
      catalogCache.apiBase === apiBase &&
      catalogCache.catalog &&
      Date.now() - catalogCache.fetchedAt < CACHE_TTL_MS
    ) {
      setCatalog(catalogCache.catalog)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const url = `${apiBase.replace(/\/$/, '')}/doctors/catalog`
      const res = await fetch(url)
      const data = await res.json()
      if (data?.catalog) {
        catalogCache = { apiBase, catalog: data.catalog, fetchedAt: Date.now() }
        setCatalog(data.catalog)
      }
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
      if (!adminCatalog || !apiBase || !token) return fetchCatalog(true)
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
      if (data?.catalog) {
        catalogCache = { apiBase, catalog: data.catalog, fetchedAt: Date.now() }
        setCatalog(data.catalog)
      }
      return data
    },
    [adminCatalog, apiBase, token, fetchCatalog]
  )

  return {
    catalog,
    loading,
    refreshCatalog: () => fetchCatalog(true),
    addSpeciality: (v) => addCatalogEntry('speciality', v),
    addTreatmentType: (v, label) => addCatalogEntry('treatment_type', v, label),
    addDisease: (v) => addCatalogEntry('disease', v),
  }
}
