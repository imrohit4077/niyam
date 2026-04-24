import {
  ArcElement,
  BarElement,
  BarController,
  CategoryScale,
  Chart as ChartJS,
  DoughnutController,
  Filler,
  Legend,
  LineElement,
  LineController,
  LinearScale,
  PieController,
  PointElement,
  Tooltip,
} from 'chart.js'

let registered = false

export function ensureChartJsRegistered() {
  if (registered) return
  ChartJS.register(
    BarController,
    LineController,
    DoughnutController,
    PieController,
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Filler,
  )
  registered = true
}
