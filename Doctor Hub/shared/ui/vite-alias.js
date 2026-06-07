import path from 'path'
import { fileURLToPath } from 'url'

/** Vite resolve.alias + dedupe so shared UI uses the app's single React copy */
export function doctorHubUiAlias(importMetaUrl) {
  const appDir = path.dirname(fileURLToPath(importMetaUrl))
  const root = path.resolve(appDir, '..')
  const nm = (pkg) => path.resolve(root, 'node_modules', pkg)

  return {
    '@doctor-hub/ui': path.resolve(root, 'shared/ui'),
    react: nm('react'),
    'react-dom': nm('react-dom'),
    'react-router-dom': nm('react-router-dom'),
  }
}

export function doctorHubDedupe() {
  return ['react', 'react-dom', 'react-router-dom']
}
