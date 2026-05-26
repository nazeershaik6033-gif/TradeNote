import { ref, reactive } from "vue";

/**************************************
* GENERAL
**************************************/
export const registerOff = ref(false)
export const parseId = ref()
export const pageId = ref()
export const currentUser = ref()
export const timeZones = ref(["America/New_York", "Asia/Shanghai", "Europe/Brussels", "Asia/Tokyo", "Asia/Hong_Kong", "Asia/Kolkata", "Europe/London", "Asia/Riyadh"])
export const timeZoneTrade = ref()
export const queryLimit = ref(10000000)
export const queryLimitExistingTrades = ref(50)
export const endOfList = ref(false) //infinite scroll
export const noData = ref(false)
export const stepper = ref()
export const hasData = ref(false)
export const itemToEditId = ref(typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('editItemId') : "")
export const currentDate = ref()
export const quill = ref()
export const sideMenuMobileOut = ref(false)
export const screenType = ref()
export const saveButton = ref(false)
export const latestVersion = ref({})
export const windowIsScrolled = ref()

export const idCurrent = ref()
export const idPrevious = ref()
export const idCurrentType = ref()
export const idCurrentNumber = ref()
export const idPreviousType = ref()
export const idPreviousNumber = ref()

export const countdownInterval = ref(null)
export const countdownSeconds = ref(5)

/* Layout & Style */
export const dailyChartZoom = ref(3) //1: zoom inn 2: medium zoom 3: fully/max zoom out


/**************************************
* LOADING AND MOUNTING
**************************************/
//General
export const spinnerLoadingPage = ref(true)
export const spinnerLoadingPageText = ref()
export const renderData = ref(0) //this is for updating DOM

export const spinnerLoadMore = ref(false) //infinite scroll

export const tabGettingScreenshots = ref(false)

//Dashboard
export const dashboardChartsMounted = ref()
export const dashboardIdMounted = ref(false)
export const barChartNegativeTagGroups = ref([])

//Charts
export const renderingCharts = ref(true) // this is for spinner

//Setups
export const spinnerSetups = ref(true)
export const spinnerSetupsText = ref()

//Legacy 
export const legacy = reactive([])

/**************************************
* MODALS
**************************************/
export const modalDailyTradeOpen = ref(false)

/**************************************
* TRADES
**************************************/
export const selectedRange = ref()
export const filteredTrades = reactive([])
export const filteredTradesDaily = reactive([])
export const filteredTradesTrades = reactive([])
export const totals = reactive({})
export const totalsByDate = reactive({})
export const groups = reactive({})
export const profitAnalysis = reactive({})
export const timeFrame = ref(15)
export const imports = ref([])

/**************************************
* ADD TRADES
**************************************/
export const pAndL = reactive({})
export const executions = reactive({})
export const trades = reactive({})
export const blotter = reactive({})
export const tradesData = reactive([])
export const tradeId = ref()
export const existingImports = reactive([])
export const existingTradesArray = reactive([])
export const gotExistingTradesArray = ref(false)
export const marketCloseTime = ref("16:00:00")