import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  DoughnutController,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PieController,
  PointElement,
  Tooltip,
} from 'chart.js'

let registered = false

/** Idempotent Chart.js registration for dashboard charts (bar, line, doughnut, pie). */
export function registerDashboardCharts() {
  if (registered) return
  registered = true
  ChartJS.register(
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Filler,
    PieController,
    DoughnutController,
  )
}
