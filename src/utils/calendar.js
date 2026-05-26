import { renderingCharts, pageId, filteredTrades, selectedMonth, calendarData, miniCalendarsData, timeZoneTrade, filteredTradesDaily } from "../stores/globals.js"
import { useMonthFormat } from "./utils.js"
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
dayjs.extend(utc)
import isoWeek from 'dayjs/plugin/isoWeek.js'
dayjs.extend(isoWeek)
import timezone from 'dayjs/plugin/timezone.js'
dayjs.extend(timezone)
import duration from 'dayjs/plugin/duration.js'
dayjs.extend(duration)
import updateLocale from 'dayjs/plugin/updateLocale.js'
dayjs.extend(updateLocale)
import localizedFormat from 'dayjs/plugin/localizedFormat.js'
dayjs.extend(localizedFormat)
import customParseFormat from 'dayjs/plugin/customParseFormat.js'
dayjs.extend(customParseFormat)
import calendarize from 'calendarize';

export async function useLoadCalendar() {
    console.log("\nLOADING CALENDAR")
    return new Promise(async (resolve, reject) => {
        renderingCharts.value = true
        miniCalendarsData.length = 0
        let currentMonthNumber = dayjs(selectedMonth.value.start * 1000).tz(timeZoneTrade.value).month()
        let tradesArray = []

        tradesArray = filteredTrades

        const createCalendar = async (param1, param2) => {
            let dateForCalendarize = new Date(dayjs.unix(param1)).toLocaleString("en-US", { timeZone: timeZoneTrade.value })
            let calendarizeData = calendarize(dateForCalendarize, 1)

            let calendarJson = {}
            let month = dayjs(param1 * 1000).tz(timeZoneTrade.value).get('month') + 1
            let year = dayjs(param1 * 1000).tz(timeZoneTrade.value).get('year')
            for (let index1 = 0; index1 < calendarizeData.length; index1++) {
                let element = calendarizeData[index1]
                calendarJson[index1] = []
                for (let index = 0; index < element.length; index++) {
                    const element2 = calendarizeData[index1][index];
                    let elementDate = year + "/" + month + "/" + element2

                    let tempData = {}
                    tempData.month = useMonthFormat(param1)
                    tempData.day = element2

                    let trade
                    for (let i = 0; i < tradesArray.length; i++) {
                        let element = tradesArray[i]
                        if (Number(element.date) == Number(element2) && (Number(element.month) + 1 == Number(month)) && Number(element.year) == Number(year)) {
                            trade = element
                        }
                    }

                    if (trade != undefined && Object.keys(trade).length != 0 && element2 != 0) {
                        tempData.pAndL = trade.pAndL
                        tempData.satisfaction = trade.satisfaction
                    } else {
                        tempData.pAndL = []
                    }
                    calendarJson[index1].push(tempData)

                }

            }
            if (param1 == selectedMonth.value.start) {
                for (let key in calendarData) delete calendarData[key]
                Object.assign(calendarData, calendarJson)
            } else {
                miniCalendarsData.unshift(calendarJson)
            }


        }

        if (pageId.value == 'calendar') {
            let i = 0
            if (pageId.value == 'calendar') {
                while (i <= currentMonthNumber) {
                    let tempUnix = dayjs(selectedMonth.value.start * 1000).tz(timeZoneTrade.value).subtract(i, 'month').startOf('month').unix()
                    createCalendar(tempUnix)
                    i++
                }
            }
        } else {
            createCalendar(selectedMonth.value.start)
        }

        resolve()
    })

}