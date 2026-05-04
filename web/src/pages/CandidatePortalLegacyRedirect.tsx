import { Navigate } from 'react-router-dom'

/** Old path `/candidate-portal/:token` → canonical public URL. */
export default function CandidatePortalLegacyRedirect() {
  return <Navigate to="/candidate-portal" replace />
}
