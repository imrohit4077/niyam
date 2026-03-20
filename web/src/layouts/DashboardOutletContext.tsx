import type { UserData } from '../api/auth'

export type DashboardOutletContext = {
  token: string
  user: UserData
  accountId: string
}
