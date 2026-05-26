import { filteredTradesTrades, blotter, pAndL, tradeExcursionId, spinnerLoadingPage, currentUser, selectedBroker, tradesData, timeZoneTrade, uploadMfePrices, executions, tradeId, existingImports, trades, gotExistingTradesArray, existingTradesArray, brokerData, selectedTradovateTier, queryLimit, queryLimitExistingTrades, marketCloseTime } from '../stores/globals.js'
import { useBrokerHeldentrader, useBrokerInteractiveBrokers, useBrokerMetaTrader5, useBrokerTdAmeritrade, useBrokerTradeStation, useBrokerTradeZero, useTradovate, useNinjaTrader, useRithmic, useFundTraders, useTastyTrade, useTopstepX } from './brokers.js'
import { useChartFormat, useDateTimeFormat, useDecimalsArithmetic, useInitParse, useTimeFormat } from './utils.js'

/* MODULES */
import Parse from 'parse/dist/parse.min.js'
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
import _ from 'lodash'
import axios from 'axios'
import Papa from 'papaparse';

let openPosition = false
let tradeAccounts = []
let tempExecutions = []
let tradedSymbols = []
let tradedStartDate = null
let tradedEndDate = null
let ohlcv = []
let mfePrices = []

let openPositionsFile = []
let openPositionsParse = []

let currentTradeId

export const testPost = async () => {
    return "test successful !!!!"
}
/****************************
 * TRADES
 ****************************/
export async function useGetExistingTradesArray(param99, param0) {
    console.log(" -> Getting existing trades for filter")

    existingTradesArray.length = 0 // reinitialize, for API

    return new Promise(async (resolve, reject) => {
        try {
            let parseObject
            let query
            if (param99 === "api") {
                let ParseNode = param0
                parseObject = ParseNode.Object.extend("trades");
                query = new ParseNode.Query(parseObject);
                query.equalTo("user", { "__type": "Pointer", "className": "_User", "objectId": currentUser.value.objectId })
            } else {
                parseObject = Parse.Object.extend("trades");
                query = new Parse.Query(parseObject);
            }
            query.descending("dateUnix");
            query.limit(queryLimitExistingTrades.value);
            const results = await query.find(param99 === "api" ? { useMasterKey: true } : "");
            for (let i = 0; i < results.length; i++) {
                const object = results[i];
                //console.log("unix time "+ object.get('dateUnix'));
                existingTradesArray.push(object.get('dateUnix'))
            }
            gotExistingTradesArray.value = true
            console.log(" -> Finished getting existing trades for filter")
            //console.log(" -> ExistingTradesArray " + JSON.stringify(existingTradesArray))
            resolve()
        } catch (error) {
            throw new Error('Error useGetExistingTradesArray ' + error);
        }
    })
}

export async function useImportTrades(param1, param2, param3, param0) {
    return new Promise(async (resolve, reject) => {
        //console.log("param1 " + param1)
        //console.log("param2 " + param2)
        //console.log("param3 " + param3)
        console.log("\nIMPORTING FILE")
        // Using Papa Parse : https://www.papaparse.com/docs
        spinnerLoadingPage.value = true
        //spinnerLoadingPageText.value = "Importing file ..."
        //console.log(" got existing " + gotExistingTradesArray.value)
        let files
        let importFileError = false
        if (param2 == "file") {
            files = param1.target.files || param1.dataTransfer.files;
            if (!files.length) {
                spinnerLoadingPage.value = false
                return;
            }
        }


        const readAsText = async (param) => {
            return new Promise(async (resolve, reject) => {
                var reader = new FileReader();
                var vm = this;
                reader.onload = e => {
                    resolve(reader.result)
                };
                reader.readAsText(param[0]);
            })
        }

        const readAsArrayBuffer = async (param) => {
            return new Promise(async (resolve, reject) => {
                let reader = new FileReader();
                reader.onload = e => {
                    resolve(reader.result);
                };
                reader.readAsArrayBuffer(param[0]);
            })
        }

        const importFileErrorFunction = (param) => {
            importFileError = true
            spinnerLoadingPage.value = false
            const file = document.querySelector('#tradesInput');
            file.value = '';
            alert("ERROR IN UPLOAD FILE\n" + param)
        }

        let fileInput
        if (param3) {
            selectedBroker.value = param3

        }

        let readAsTextArray = ["tradeZero", "template", "tdAmeritrade", "interactiveBrokers" , "tradovate", "ninjaTrader", "heldentrader", "rithmic", "fundTraders", "tastyTrade", "topstepX"]
        if (readAsTextArray.includes(selectedBroker.value)) {
            if (param2 == "api") {
                fileInput = param1
            } else {
                fileInput = await readAsText(files)
            }
        }

        let readAsArrayBufferArray = ["metaTrader5"]
        if (readAsArrayBufferArray.includes(selectedBroker.value)) {
            if (param2 == "api") {
                fileInput = param1
            } else {
                fileInput = await readAsArrayBuffer(files)
            }
        }

        /****************************
         * TRADEZERO
         ****************************/

        if (selectedBroker.value == "tradeZero" || selectedBroker.value == "template") {
            console.log(" -> TradeZero / Template")
            await useBrokerTradeZero(fileInput).catch(error => {
                console.log(" errror " + error)
                importFileErrorFunction(error)
            })
        }

        /****************************
         * METATRADER 5
         ****************************/
        if (selectedBroker.value == "metaTrader5") {
            console.log(" -> MetaTrader 5")
            await useBrokerMetaTrader5(fileInput).catch(error => {
                importFileErrorFunction(error)
            })
        }

        /****************************
         * TD AMERITRADE
         ****************************/
        if (selectedBroker.value == "tdAmeritrade") {
            console.log(" -> TD Ameritrade")
            await useBrokerTdAmeritrade(fileInput).catch(error => {
                importFileErrorFunction(error)
            })
        }

        /****************************
         * TRADESTATION
         ****************************/
        if (selectedBroker.value == "tradeStation") {
            console.log(" -> Trade Station")
            fileInput = brokerData.value
            //console.log("file input "+fileInput)
            await useBrokerTradeStation(fileInput).catch(error => {
                importFileErrorFunction(error)
            })
        }

        /****************************
         * INTERACTIVE BROKERS
         ****************************/
        if (selectedBroker.value == "interactiveBrokers") {
            console.log(" -> Interactive Brokers")
            await useBrokerInteractiveBrokers(fileInput).catch(error => {
                importFileErrorFunction(error)
            })
        }

        /****************************
         * TRADOVATE
         ****************************/
        if (selectedBroker.value == "tradovate") {
            console.log(" -> Tradovate")
            console.log(' -> Selected tier ' + selectedTradovateTier.value)
            if (!selectedTradovateTier.value) {
                alert("Select commision plan")
                spinnerLoadingPage.value = false
                return
            }
            await useTradovate(fileInput).catch(error => {
                importFileErrorFunction(error)
            })
        }

        /****************************
         * NINJATRADER
         ****************************/
        if (selectedBroker.value == "ninjaTrader") {
            console.log(" -> NinjaTrader")
            await useNinjaTrader(fileInput).catch(error => {
                importFileErrorFunction(error)
            })
        }

        /****************************
         * HELDENTRADER
         ****************************/
        if (selectedBroker.value == "heldentrader") {
            console.log(" -> Heldentrader")
            await useBrokerHeldentrader(fileInput).catch(error => {
                importFileErrorFunction(error)
            })
        }

        /****************************
        * RITHMIC
        ****************************/
        if (selectedBroker.value == "rithmic") {
            console.log(" -> Rithmic")
            await useRithmic(fileInput).catch(error => {
                importFileErrorFunction(error)
            })
        }

        /****************************
         * FUNDTRADERS
         ****************************/
        if (selectedBroker.value == "fundTraders") {
            console.log(" -> FundTraders")
            await useFundTraders(fileInput).catch(error => {
                importFileErrorFunction(error)
            })
        }

        /****************************
         * TASTYTRADE
         ****************************/
        if (selectedBroker.value == "tastyTrade") {
            console.log(" -> TastyTrade")
            await useTastyTrade(fileInput).catch(error => {
                importFileErrorFunction(error)
            })
        }

        /****************************
         * TOPSTEPX
         ****************************/
        if (selectedBroker.value == "topstepX") {
            console.log(" -> TopstepX")
            await useTopstepX(fileInput).catch(error => {
                importFileErrorFunction(error)
            })
        }


        /****************************
        * CREATE EXECUTIONS, TRADES
        ****************************/
        const create = async () => {
            await createTempExecutions().catch((error) => {
                if (param2 != "api") {
                    alert("Error in upload file (" + error + ")")
                }
            })

            await createExecutions()

            if (currentUser.value.hasOwnProperty('apis') && (currentUser.value.apis.findIndex(obj => obj.provider === 'polygon' || obj.provider === 'databento') > -1) && uploadMfePrices.value) {

                let databentoIndex = currentUser.value.apis.findIndex(obj => obj.provider === "databento")
                let polygonIndex = currentUser.value.apis.findIndex(obj => obj.provider === "polygon")

                if (databentoIndex > -1 && currentUser.value.apis[databentoIndex].key != "") {
                    try {
                        await useGetOHLCV("databento", param2);
                    } catch (error) {
                        if (param2 != "api") {
                            alert("Error getting OHLCV (" + error + ")")
                        }
                        reject("Error getting OHLCV (" + error + ")")
                        return; // stop the function execution
                    }
                } else if (polygonIndex > -1 && currentUser.value.apis[polygonIndex].key != "") {
                    try {
                        await useGetOHLCV("polygon", param2);
                    } catch (error) {
                        if (param2 != "api") {
                            alert("Error getting OHLCV (" + error + ")")
                        }
                        reject("Error getting OHLCV (" + error + ")")
                        return; // stop the function execution
                    }
                } else {
                    console.log(" -> No APIs stored for MFE and charts")
                }
            }
            
            await getOpenPositionsParse(param2, param0)
            await createTrades()
            await filterExisting("trades")
            await useCreateBlotter()
            await useCreatePnL()


            await (spinnerLoadingPage.value = false)
            resolve()

        }

        const retryFunction = (callback, delay, tries) => {

            if (tries && callback() !== true) {
                setTimeout(retryFunction.bind(this, callback, delay, tries - 1), delay);
            } else {
                //if still false, send alert else create
                if (!gotExistingTradesArray.value) {
                    spinnerLoadingPage.value = false
                    alert("TradeNote didn't have enough time to fetch existing trades from database before parsing your file. Please refresh the page and wait a little bit longer before adding your file and thus giving TradeNote some more time to run this background job.")
                    return;
                }
                if (!importFileError) {
                    create()
                } else {
                    return
                }
            }
        }

        const callbackFunction = () => {
            console.log(" -> Waiting for existing trades");
            return gotExistingTradesArray.value
        }

        if (gotExistingTradesArray.value) {
            if (!importFileError) {
                create()
            } else {
                return
            }
        } else {
            retryFunction(callbackFunction, 1000, 10);
        }

    })
}

async function createTempExecutions() {
    return new Promise(async (resolve, reject) => {
        console.log("\nCREATING TEMP EXECUTION")

        //spinnerLoadingPageText.value = "Creating temp executions"
        const keys = Object.keys(tradesData);
        var temp = [];
        var i = 0

        var lastId
        var x


        tempExecutions.length = 0 // reinitialize, for API
        tradedSymbols.length = 0 // reinitialize, for API

        for (const key of keys) {
            try {
                let temp2 = {};
                temp2.account = tradesData[key].Account
                temp2.broker = selectedBroker.value
                if (!tradeAccounts.includes(tradesData[key].Account)) tradeAccounts.push(tradesData[key].Account)
                const dateArrayTD = tradesData[key]['T/D'].split('/');
                const formatedDateTD = dateArrayTD[2] + "-" + dateArrayTD[0] + "-" + dateArrayTD[1]

                temp2.td = dayjs.tz(formatedDateTD, timeZoneTrade.value).unix()

                const dateArraySD = tradesData[key]['S/D'].split('/');
                const formatedDateSD = dateArraySD[2] + "-" + dateArraySD[0] + "-" + dateArraySD[1]
                temp2.sd = dayjs.tz(formatedDateSD, timeZoneTrade.value).unix()

                temp2.currency = tradesData[key].Currency;
                temp2.type = tradesData[key].Type;
                temp2.side = tradesData[key].Side;
                if (temp2.side == "B") {
                    temp2.strategy = "long"
                }
                if (temp2.side == "S") {
                    temp2.strategy = "long"
                }
                if (temp2.side == "BC") {
                    temp2.strategy = "short"
                }
                if (temp2.side == "SS") {
                    temp2.strategy = "short"
                }
                temp2.symbol = tradesData[key].Symbol.replace(".", "_")
                temp2.symbolOriginal = tradesData[key].SymbolOriginal
                temp2.quantity = parseFloat(tradesData[key].Qty);
                temp2.price = parseFloat(tradesData[key].Price);

                temp2.execTime = dayjs.tz(formatedDateTD + " " + tradesData[key]['Exec Time'], timeZoneTrade.value).unix()
                let tempId = "e" + temp2.execTime + "_" + temp2.symbol.replace(".", "_") + "_" + temp2.type + "_" + temp2.side;
                // It happens that two or more trades happen at the same (second) time. So we need to differentiated them
                if (tempId != lastId) {
                    x = 1
                    temp2.id = tempId + "_" + x
                    lastId = tempId
                } else {
                    x++
                    temp2.id = tempId + "_" + x
                }
                temp2.commission = parseFloat(tradesData[key].Comm);
                temp2.sec = parseFloat(tradesData[key].SEC);
                temp2.taf = parseFloat(tradesData[key].TAF);
                temp2.nscc = parseFloat(tradesData[key].NSCC);
                temp2.nasdaq = parseFloat(tradesData[key].Nasdaq);
                temp2.ecnRemove = parseFloat(tradesData[key]['ECN Remove']);
                temp2.ecnAdd = parseFloat(tradesData[key]['ECN Add']);
                temp2.grossProceeds = parseFloat(tradesData[key]['Gross Proceeds']);
                temp2.netProceeds = parseFloat(tradesData[key]['Net Proceeds']);
                temp2.clrBroker = tradesData[key]['Clr Broker'];
                temp2.liq = tradesData[key].Liq;
                temp2.note = tradesData[key].Note;
                temp2.trade = null;

                tempExecutions.push(temp2);


                let index = tradedSymbols.findIndex(obj => obj.symbol === temp2.symbol)
                if (index === -1) {
                    let temp = {}
                    temp.symbol = temp2.symbol
                    temp.secType = temp2.type
                    tradedSymbols.push(temp)
                }

                if (tradedStartDate == null) {
                    tradedStartDate = temp2.td
                } else if (temp2.td < tradedStartDate) {
                    tradedStartDate = temp2.td
                }

                if (tradedEndDate == null) {
                    tradedEndDate = temp2.execTime
                } else if (temp2.execTime > tradedEndDate) {
                    tradedEndDate = temp2.execTime
                }

            } catch (error) {
                console.log("  --> ERROR " + error)
                reject(error)
            }
        }
        console.log(" -> Created temp executions");
        console.log(" -> Created traded symbols");
        resolve()
    })

}

async function createExecutions() {
    return new Promise(async (resolve, reject) => {
        console.log("\nCREATING EXECUTIONS")
        //spinnerLoadingPageText.value = "Creating executions"
        var a = _
            .chain(tempExecutions)
            .orderBy(["execTime"], ["asc"])
            .groupBy("td");

        for (let key in executions) delete executions[key]
        Object.assign(executions, JSON.parse(JSON.stringify(a)))

        console.log(" -> Created");
        resolve()
    })
}

export const useCreateOHLCV = (param, param2) => {
    //console.log(" param "+JSON.stringify(param))
    return new Promise(async (resolve, reject) => {
        let papaParse = Papa.parse(param, { header: true })
        let tempArray = papaParse.data
        //console.log(' tempArray ' + JSON.stringify(tempArray))
        for (let index = 0; index < tempArray.length; index++) {
            const element = tempArray[index];
            if (element.ts_event) {

                let NYTime = dayjs.tz(element.ts_event, "UTC").tz(timeZoneTrade.value).unix() // telling it's UTC time and converting to trade TZ

                let temp2 = {}
                temp2.v = Number(element.volume)
                temp2.o = Number(element.open)
                temp2.c = Number(element.close)
                temp2.h = Number(element.high)
                temp2.l = Number(element.low)
                temp2.t = NYTime * 1000
                param2.ohlcv.push(temp2)

            }

            if ((index + 1) === tempArray.length) {
                ohlcv.push(param2) // this is used for when adding trades
                resolve(param2) // resolving only param2, used for daily.vue (because I just want to get back the created OHLC, not the full / existing ohlcv array)
            }

        }
    })
}

export const useGetOHLCV = (param, param2, param3, param4, param5) => { //param=databento/polygon, param2=api or other, param3+ is used for AddExcursions: param3=tradedSymbols, param4=tradedStartDate, param5=tradedEndDate
    return new Promise(async (resolve, reject) => {
        console.log("\nGETTING OHLCV from " + param)
        
        if (param3) tradedSymbols = param3
        if (param4) tradedStartDate = param4
        if (param5) tradedEndDate = param5
        
        console.log(" Traded Symbols " + JSON.stringify(tradedSymbols))
        ohlcv.length = 0 // reinitialize, for API

        const asyncLoop = async () => {
            for (let i = 0; i < tradedSymbols.length; i++) {
                let temp = {}
                temp.symbol = tradedSymbols[i].symbol
                let databentoSymbol = temp.symbol
                let stype_in = "raw_symbol"

                console.log(" -> From date " + tradedStartDate)
                console.log(" -> To " + tradedEndDate)
                let toDate = dayjs(tradedEndDate * 1000).endOf('day').unix()
                console.log(" -> To date " + toDate)

                if (param === "databento") {
                    let dataset
                    temp.ohlcv = []

                    if (tradedSymbols[i].secType === "future") {
                        dataset = "GLBX.MDP3"
                        databentoSymbol = temp.symbol + ".c.0"
                        stype_in = "continuous"

                    } else if (tradedSymbols[i].secType === "stock") {
                        dataset = "XNAS.ITCH"

                    } else if (tradedSymbols[i].secType === "call" || tradedSymbols[i].secType === "put") {

                    } else if (tradedSymbols[i].secType === "forex") {

                    }
                    let index = currentUser.value.apis.findIndex(obj => obj.provider === 'databento')

                    let data =
                    {
                        'dataset': dataset,
                        'stype_in': stype_in,
                        'symbols': databentoSymbol,
                        'schema': 'ohlcv-1m',
                        'start': tradedStartDate * 1000000000,
                        'end': toDate * 1000000000,
                        'encoding': 'csv',
                        'pretty_px': 'true',
                        'pretty_ts': 'true',
                        'map_symbols': 'true',
                        'username': currentUser.value.apis[index].key
                    }

                    if (param2 === "api") {
                        try {
                            const username = currentUser.value.apis[index].key
                            const password = '';


                            let config = {
                                method: 'post',
                                maxBodyLength: Infinity,
                                url: "https://hist.databento.com/v0/timeseries.get_range",
                                headers: {
                                    'Content-Type': 'application/x-www-form-urlencoded',
                                    'Authorization': 'Basic ' + Buffer.from(username + ':' + password).toString('base64')
                                },
                                data: data
                            };

                            axios.request(config)
                                .then(async (response) => {
                                    await useCreateOHLCV(response.data, temp)
                                    resolve()
                                })
                                .catch((error) => {
                                    console.log(" -> Error in databento response " + error)
                                    reject(error)
                                });

                        } catch (error) {
                            console.log(" -> Error getting databento " + error)
                            reject(error)
                        }
                    } else {
                        axios.post('/api/databento', data)
                            .then(async (response) => {
                                await useCreateOHLCV(response.data, temp)
                                resolve(ohlcv)
                            })
                            .catch((error) => {
                                console.log(" -> Error in databento response " + error)
                                reject(error)
                            });
                    }


                } else if (param === "polygon") {
                    axios.interceptors.response.use(undefined, (err) => {
                        const { config, message } = err;
                        if (err) {
                            console.log(" -> Interceptors status " + err.response.status)
                            console.log(" -> Interceptors data " + JSON.stringify(err.response.data))
                            console.log(" -> Interceptors message " + message)
                        }
                        if (!config || !config.retry) {
                            return Promise.reject(err);
                        }

                        // If there is an error and the status is not 429, we just alert (return rejection). Else we continue and retry
                        if (err.response.status != 429) {
                            alert("Error getting OHLCV with message: " + message)
                            return Promise.reject(err);
                        }

                        config.retry -= 1;

                        const delayRetryRequest = new Promise((resolve) => {
                            setTimeout(() => {
                                console.log(" -> Retrying the request ", config.url);
                                resolve();
                            }, config.retryDelay || 1000);
                        });

                        return delayRetryRequest.then(() => axios(config));
                    });

                    // when request, can set retry times and retry delay time
                    let index = currentUser.value.apis.findIndex(obj => obj.provider === 'polygon')
                    await axios.get("https://api.polygon.io/v2/aggs/ticker/" + temp.symbol + "/range/1/minute/" + tradedStartDate * 1000 + "/" + toDate * 1000 + "?adjusted=true&sort=asc&limit=50000&apiKey=" + currentUser.value.apis[index].key, { retry: 5, retryDelay: 60000 })
                        .then((response) => {
                            temp.ohlcv = response.data.results
                            ohlcv.push(temp)
                            resolve(ohlcv)
                        })
                        .catch((error) => {

                            console.log(" -> Polygon api get error " + error.status);
                            reject(error)
                        })
                        .finally(function () {
                            // always executed
                        })
                }

            }

        }
        await asyncLoop()
    })
}

export const useGetMFEPrices = (tempExec, initEntryTime, initEntryPrice, trde, ohlcvParam) => {
    return new Promise(async (resolve, reject) => {
        console.log("  --> Getting MFE Price")

        if (ohlcvParam) {
            ohlcv = ohlcvParam //case when we add MFE from daily
        }

        let ohlcvSymbol = ohlcv[ohlcv.findIndex(f => f.symbol == tempExec.symbol)].ohlcv

        if (ohlcvSymbol != undefined) {
            let tempStartIndex = ohlcvSymbol.findIndex(n => n.t >= initEntryTime * 1000)
            let tempEndIndex = ohlcvSymbol.findIndex(n => n.t >= trde.exitTime * 1000) //findIndex returns the first element
            let tempStartTime = ohlcvSymbol[tempStartIndex]
            let tempEndTime = ohlcvSymbol[tempEndIndex]

            let startIndex
            let endIndex
            let startTime
            let endTime

            if (tempStartTime == initEntryTime) {
                startIndex = tempStartIndex + 1
                startTime = ohlcvSymbol[startIndex].t
            } else {
                startIndex = tempStartIndex
                startTime = ohlcvSymbol[tempStartIndex].t
            }

            if (tempEndTime == trde.exitTime) {
                endIndex = tempEndIndex
                endTime = tempEndTime
            } else {
                endIndex = tempEndIndex - 1
                endTime = ohlcvSymbol[tempEndIndex - 1].t
            }

            let endTimeDay = dayjs(endTime).tz(timeZoneTrade.value).get("date")
            let endTimeMonth = dayjs(endTime).tz(timeZoneTrade.value).get("month") + 1
            let endTimeYear = dayjs(endTime).tz(timeZoneTrade.value).get("year")
            let endTimeDate = endTimeYear + "-" + endTimeMonth + "-" + endTimeDay + " "+ marketCloseTime.value
            let marketCloseDateTime = dayjs.tz(endTimeDate, timeZoneTrade.value)

            let tempEndOfDayTimeIndex = ohlcvSymbol.findIndex(f => f.t >= marketCloseDateTime)
            let endOfDayTimeIndex = tempEndOfDayTimeIndex - 1

            let tempMfe = {}
            //check is same timeframe
            if (endTime < startTime) { //entry and exit are in the same 1mn timeframe
                console.log("   ---> Trade is in same 1mn timeframe")

                tempMfe.tradeId = trde.id
                tempMfe.dateUnix = tempExec.td
                tempMfe.mfePrice = initEntryPrice
                mfePrices.push(tempMfe)

            } else {
                let priceDifference
                let mfePrice = initEntryPrice

                if (trde.strategy == "long") {
                    priceDifference = trde.exitPrice - initEntryPrice
                }
                if (trde.strategy == "short") {
                    priceDifference = initEntryPrice - trde.exitPrice
                }

                console.log("   ---> Iterating between entry price and exit price")

                for (let i = startIndex; i <= endIndex; i++) {
                    if (trde.strategy == "long" && ohlcvSymbol[i].h > trde.exitPrice && ohlcvSymbol[i].h > mfePrice) mfePrice = ohlcvSymbol[i].h
                    if (trde.strategy == "short" && ohlcvSymbol[i].l < trde.exitPrice && ohlcvSymbol[i].l < mfePrice) mfePrice = ohlcvSymbol[i].l

                }
                if (initEntryPrice != trde.exitPrice && priceDifference > 0) { //case where stop or exit price loss above entryprice
                    console.log("   ---> Iterating between exit price and up until price hits / equals entry price, and at the latest until market close")
                    let i = endIndex
                    let ohlcvSymbolPrice
                    trde.strategy == "long" ? ohlcvSymbolPrice = ohlcvSymbol[endIndex].h : ohlcvSymbolPrice = ohlcvSymbol[endIndex].l

                    while ((trde.strategy == "long" ? ohlcvSymbolPrice > initEntryPrice : ohlcvSymbolPrice < initEntryPrice) && i <= endOfDayTimeIndex) {
                        trde.strategy == "long" ? ohlcvSymbolPrice = ohlcvSymbol[i].h : ohlcvSymbolPrice = ohlcvSymbol[i].l
                        if (trde.strategy == "long" && ohlcvSymbolPrice > initEntryPrice && ohlcvSymbolPrice > mfePrice) mfePrice = ohlcvSymbolPrice
                        if (trde.strategy == "short" && ohlcvSymbolPrice < initEntryPrice && ohlcvSymbolPrice < mfePrice) mfePrice = ohlcvSymbolPrice
                        i++

                    }
                }

                if (trde.strategy == "long" && mfePrice < initEntryPrice) mfePrice = initEntryPrice
                if (trde.strategy == "short" && mfePrice > initEntryPrice) mfePrice = initEntryPrice

                console.log("    ----> " + trde.strategy + " stratgy with entry at " + useDateTimeFormat(initEntryTime) + " @ " + initEntryPrice + " -> exit at " + useDateTimeFormat(trde.exitTime) + " @ " + trde.exitPrice + " and MFE price " + mfePrice)

                trde.excursions = {}
                trde.excursions.stopLoss = null
                trde.excursions.maePrice = null
                trde.excursions.mfePrice = mfePrice

                tempMfe.tradeId = trde.id
                tempMfe.dateUnix = tempExec.td
                tempMfe.mfePrice = mfePrice
                mfePrices.push(tempMfe)
            }
        } else {
            console.log("   ---> Cannot find symbol in market data provider")
        }
        resolve(mfePrices)
    })
}

async function getOpenPositionsParse(param99, param0) {
    return new Promise(async (resolve, reject) => {
        console.log("\nGETTING OPEN TRADES PARSE")
        openPositionsParse.length = 0 // reinitialize, for API
        let parseObject
        let query
        if (param99 === "api") {
            let ParseNode = param0
            parseObject = ParseNode.Object.extend("trades");
            query = new ParseNode.Query(parseObject);
            query.equalTo("user", { "__type": "Pointer", "className": "_User", "objectId": currentUser.value.objectId })
        } else {
            parseObject = Parse.Object.extend("trades");
            query = new Parse.Query(parseObject);
        }

        query.descending("dateUnix");
        query.equalTo("openPositions", true);
        const results = await query.find(param99 === "api" ? { useMasterKey: true } : undefined);
        for (let i = 0; i < results.length; i++) {
            const object = results[i];
            object.get('trades').forEach(element => {
                if (element.openPosition) {
                    openPositionsParse.push(element)
                }
            });

        }
        resolve()
    })
}

async function createTrades() {
    return new Promise(async (resolve, reject) => {
        console.log("\nCREATING TRADES")
        var b = _
            .chain(tempExecutions)
            .orderBy(["execTime"], ["asc"])
            .groupBy(item => `"${item.symbol}+${item.type}+${item.strategy}+${item.td}"`);

        let objectB = JSON.parse(JSON.stringify(b))

        const keys2 = Object.keys(objectB);

        var newIds = []
        var temp2 = []

        mfePrices.length = 0 // reinitialize, for API
        openPositionsFile.length = 0 // reinitialize, for API

        for (const key2 of keys2) {
            var tempExecs = objectB[key2]
            var newTrade = true
            var invertedLong = false
            var invertedShort = false
            var grossWinsCount = 0
            var netWinsCount = 0
            var grossLossCount = 0
            var netLossCount = 0
            var tradesCount = 0
            let temp7 = {}

            let initEntryTime
            let initEntryPrice
            let i
            let existingOpenPosition
            console.log("\n ------ ITERATING SYMBOL " + key2 + " on " + useChartFormat(tempExecs[0].td) + " ------")
            for (let i = 0; i < tempExecs.length; i++) {
                let tempExec = tempExecs[i];

                const existingOpenPositionParseIndex = openPositionsParse.findIndex(x => x.symbol == tempExec.symbol && x.type == tempExec.type && x.strategy == tempExec.strategy)

                const existingOpenPositionFileIndex = openPositionsFile.findIndex(x => x.symbol == tempExec.symbol && x.type == tempExec.type && x.strategy == tempExec.strategy)

                if (newTrade == true) {
                    console.log(" -> New trade from " + useTimeFormat(tempExec.execTime))
                    existingOpenPosition = {}

                    if (existingOpenPositionParseIndex != -1) {
                        console.log("  --> Open position already in Parse")

                        Object.keys(openPositionsParse[existingOpenPositionParseIndex]).forEach((key) => {
                            if (key == "td") {
                                existingOpenPosition.td = tempExec.td
                            } else {
                                existingOpenPosition[key] = openPositionsParse[existingOpenPositionParseIndex][key]
                            }
                        })
                        currentTradeId = existingOpenPosition.id
                        temp2.push(existingOpenPosition)
                        newTrade = false

                    }
                    else if (existingOpenPositionFileIndex != -1) {
                        console.log("  --> Open position already in current file")
                
                        Object.keys(openPositionsFile[existingOpenPositionFileIndex]).forEach((key) => {
                            if (key == "td") {
                                existingOpenPosition.td = tempExec.td
                            } else {
                                existingOpenPosition[key] = openPositionsFile[existingOpenPositionFileIndex][key]
                            }
                        })
                        currentTradeId = existingOpenPosition.id
                        existingOpenPosition.td = tempExec.td;
                        temp2.push(existingOpenPosition)
                        newTrade = false

                        openPositionsFile.splice(existingOpenPositionFileIndex, 1)
                        
                    } else {
                        console.log("  --> No existing open position (in Parse nor in current file)")
                        existingOpenPosition = undefined
                    }

                }

                if (newTrade == true) {
                    openPosition = true
                    newTrade = false
                    var invertedLong = false
                    var invertedShort = false

                    temp7.id = tempExec.side == "B" || tempExec.side == "S" ? "t" + tempExec.execTime + "_" + tempExec.symbol + "_" + tempExec.type + "_B" : "t" + tempExec.execTime + "_" + tempExec.symbol  + "_" + tempExec.type + "_SS"
                    console.log("  --> ID " + temp7.id)
                    currentTradeId = temp7.id
                    temp7.account = tempExec.account;
                    temp7.broker = tempExec.broker
                    temp7.td = tempExec.td;
                    temp7.currency = tempExec.currency;
                    temp7.type = tempExec.type;
                    temp7.side = tempExec.side;
                    if (tempExec.side == "B") {
                        temp7.strategy = "long"
                        temp7.buyQuantity = tempExec.quantity;
                        temp7.sellQuantity = 0
                    }
                    if (tempExec.side == "S") {
                        temp7.strategy = "long"
                        console.log("  --> Symbol " + key2 + " is accounted as sell before buy on date " + useChartFormat(tempExec.td) + " at " + useTimeFormat(tempExec.execTime))
                        invertedLong = true
                        temp7.buyQuantity = 0
                        temp7.sellQuantity = tempExec.quantity;
                    }
                    if (tempExec.side == "SS") {
                        temp7.strategy = "short"
                        temp7.sellQuantity = tempExec.quantity;
                        temp7.buyQuantity = 0
                    }
                    if (tempExec.side == "BC") {
                        temp7.strategy = "short"
                        console.log("  --> Symbol " + key2 + " is accounted as buy cover before short sell on date " + useChartFormat(tempExec.td) + " at " + useTimeFormat(tempExec.execTime))
                        invertedShort = true
                        temp7.buyQuantity = tempExec.quantity;
                        temp7.sellQuantity = 0
                    }
                    temp7.symbol = tempExec.symbol;
                    temp7.symbolOriginal = tempExec.symbolOriginal;
                    temp7.entryTime = tempExec.execTime;
                    initEntryTime = tempExec.execTime
                    temp7.exitTime = 0
                    temp7.entryPrice = tempExec.price
                    initEntryPrice = tempExec.price
                    temp7.exitPrice = 0

                    temp7.commissionOpen = tempExec.commission;
                    temp7.commission = 0
                    temp7.secOpen = tempExec.sec;
                    temp7.sec = 0
                    temp7.tafOpen = tempExec.taf;
                    temp7.taf = 0
                    temp7.nsccOpen = tempExec.nscc;
                    temp7.nscc = 0
                    temp7.nasdaqOpen = tempExec.nasdaq;
                    temp7.nasdaq = 0
                    temp7.ecnRemoveOpen = tempExec.ecnRemove;
                    temp7.ecnRemove = 0
                    temp7.ecnAddOpen = tempExec.ecnAdd;
                    temp7.ecnAdd = 0

                    temp7.clrBroker = tempExec.clrBroker;
                    temp7.liq = tempExec.liq;

                    temp7.grossEntryProceedsOpen = tempExec.grossProceeds;
                    temp7.grossEntryProceeds = 0
                    temp7.grossExitProceedsOpen = 0
                    temp7.grossExitProceeds = 0
                    temp7.grossProceedsOpen = tempExec.grossProceeds;
                    temp7.grossProceeds = 0
                    temp7.grossWins = 0
                    temp7.grossLoss = 0
                    temp7.grossSharePL = 0
                    temp7.grossSharePLWins = 0
                    temp7.grossSharePLLoss = 0
                    temp7.grossStatus = null

                    temp7.netEntryProceedsOpen = tempExec.netProceeds;
                    temp7.netEntryProceeds = 0
                    temp7.netExitProceedsOpen = 0
                    temp7.netExitProceeds = 0
                    temp7.netProceedsOpen = tempExec.netProceeds;
                    temp7.netProceeds = 0
                    temp7.netWins = 0
                    temp7.netLoss = 0
                    temp7.netSharePL = 0
                    temp7.netSharePLWins = 0
                    temp7.netSharePLLoss = 0
                    temp7.netStatus = null

                    temp7.executionsCount = 1
                    temp7.tradesCount = 0
                    temp7.grossWinsQuantity = 0
                    temp7.grossLossQuantity = 0
                    temp7.grossWinsCount = 0
                    temp7.grossLossCount = 0
                    temp7.netWinsQuantity = 0
                    temp7.netLossQuantity = 0
                    temp7.netWinsCount = 0
                    temp7.netLossCount = 0

                    temp7.note = tempExec.note
                    temp7.executions = []
                    temp7
                        .executions
                        .push(tempExec.id)
                    temp7.openPosition = true
                    let exec = executions[tempExec.td].find(x => x.id == tempExec.id)
                    exec.trade = temp7.id;

                    console.log("  --> buy quantity " + temp7.buyQuantity + " and sell quantity " + temp7.sellQuantity)
                    console.log("  --> grossProceeds " + temp7.grossProceedsOpen + " and netProceeds " + temp7.netProceedsOpen)

                    temp2.push(temp7)

                    openPositionsFile.push(temp7)

                } else if (newTrade == false) {
                    console.log("  --> Concatenating trade from " + useTimeFormat(tempExec.execTime))

                    let trde
                    if (existingOpenPosition != undefined) {
                        trde = temp2.find(x => x.id == existingOpenPosition.id && x.td == existingOpenPosition.td)

                    } else {
                        trde = temp2.find(x => x.id == temp7.id)
                    }

                    if (trde.strategy == "long") {
                        if (!invertedLong) {
                            if (tempExec.side == trde.side) {
                                trde.buyQuantity = useDecimalsArithmetic(trde.buyQuantity, tempExec.quantity)
                            } else {
                                trde.sellQuantity = useDecimalsArithmetic(trde.sellQuantity, tempExec.quantity)
                            }
                        } else {
                            if (tempExec.side == trde.side) {
                                trde.sellQuantity = useDecimalsArithmetic(trde.sellQuantity, tempExec.quantity)
                            } else {
                                trde.buyQuantity = useDecimalsArithmetic(trde.buyQuantity, tempExec.quantity)
                            }
                        }
                    }

                    if (trde.strategy == "short") {
                        if (!invertedShort) {
                            if (tempExec.side == trde.side) {
                                trde.sellQuantity = useDecimalsArithmetic(trde.sellQuantity, tempExec.quantity)
                            } else {
                                trde.buyQuantity = useDecimalsArithmetic(trde.buyQuantity, tempExec.quantity)
                            }
                        } else {
                            if (tempExec.side == trde.side) {
                                trde.buyQuantity = useDecimalsArithmetic(trde.buyQuantity, tempExec.quantity)
                            } else {
                                trde.sellQuantity = useDecimalsArithmetic(trde.sellQuantity, tempExec.quantity)
                            }
                        }
                    }

                    trde.commissionOpen = trde.commissionOpen + tempExec.commission;
                    trde.secOpen = trde.secOpen + tempExec.sec;
                    trde.tafOpen = trde.tafOpen + tempExec.taf;
                    trde.nsccOpen = trde.nsccOpen + tempExec.nscc;
                    trde.nasdaqOpen = trde.nasdaqOpen + tempExec.nasdaq;

                    trde.grossExitProceedsOpen = trde.grossExitProceedsOpen + tempExec.grossProceeds
                    trde.grossProceedsOpen = trde.grossProceedsOpen + tempExec.grossProceeds

                    trde.netExitProceedsOpen = trde.netExitProceedsOpen + tempExec.netProceeds
                    trde.netProceedsOpen = trde.netProceedsOpen + tempExec.netProceeds
                    trde
                        .executions
                        .push(tempExec.id)

                    trde.executionsCount += 1

                    let exec = executions[tempExec.td].find(x => x.id == tempExec.id)
                    exec.trade = trde.id;

                    console.log("  --> buy quantity " + trde.buyQuantity + " and sell quantity " + trde.sellQuantity)
                    console.log("  --> grossProceeds " + trde.grossProceedsOpen + " and netProceeds " + trde.netProceedsOpen)

                    let openPositionIndex = -1
                    if (openPositionsFile.length > 0) openPositionIndex = openPositionsFile.findIndex(x => x.id == trde.id)
                    if (openPositionIndex != -1) openPositionsFile.splice(openPositionIndex, 1)

                    if (trde.buyQuantity == trde.sellQuantity) {
                        trde.exitPrice = tempExec.price;
                        trde.exitTime = tempExec.execTime;

                        trde.commission = trde.commissionOpen
                        trde.commissionOpen = 0
                        trde.sec = trde.secOpen
                        trde.secOpen = 0
                        trde.taf = trde.tafOpen
                        trde.tafOpen = 0
                        trde.nscc = trde.nsccOpen
                        trde.nsccOpen = 0
                        trde.nasdaq = trde.nasdaqOpen
                        trde.nasdaqOpen = 0

                        trde.grossEntryProceeds = trde.grossEntryProceedsOpen
                        trde.grossEntryProceedsOpen = 0
                        trde.grossExitProceeds = trde.grossExitProceedsOpen
                        trde.grossExitProceedsOpen = 0
                        trde.grossProceeds = trde.grossProceedsOpen
                        trde.grossProceedsOpen = 0

                        trde.netEntryProceeds = trde.netEntryProceedsOpen
                        trde.netEntryProceedsOpen = 0
                        trde.netExitProceeds = trde.netExitProceedsOpen
                        trde.netExitProceedsOpen = 0
                        trde.netProceeds = trde.netProceedsOpen
                        trde.netProceedsOpen = 0

                        trde.grossSharePL = trde.grossProceeds / (trde.buyQuantity)

                        trde.grossSharePL >= 0 ? trde.grossSharePLWins = trde.grossSharePL : trde.grossSharePLLoss = trde.grossSharePL


                        if (trde.grossProceeds >= 0) {
                            trde.grossStatus = "win"
                            trde.grossWinsQuantity = trde.buyQuantity
                            trde.grossWins = trde.grossProceeds
                            grossWinsCount = 1
                            grossLossCount = 0
                        } else {
                            trde.grossStatus = "loss"
                            trde.grossLossQuantity = trde.buyQuantity
                            trde.grossLoss = trde.grossProceeds
                            grossLossCount = 1
                            grossWinsCount = 0
                        }

                        trde.netSharePL = trde.netProceeds / (trde.buyQuantity)
                        trde.netSharePL >= 0 ? trde.netSharePLWins = trde.netSharePL : trde.netSharePLLoss = trde.netSharePL

                        if (trde.netProceeds >= 0) {
                            trde.netStatus = "win"
                            trde.netWinsQuantity = trde.buyQuantity
                            trde.netWins = trde.netProceeds
                            netWinsCount = 1
                            netLossCount = 0
                        } else {
                            trde.netStatus = "loss"
                            trde.netLossQuantity = trde.buyQuantity
                            trde.netLoss = trde.netProceeds
                            netLossCount = 1
                            netWinsCount = 0
                        }

                        tradesCount = 1
                        trde.grossWinsCount = grossWinsCount
                        trde.netWinsCount = netWinsCount
                        trde.grossLossCount = grossLossCount
                        trde.netLossCount = netLossCount
                        trde.tradesCount = tradesCount



                        if (uploadMfePrices.value && ohlcv.findIndex(f => f.symbol == tempExec.symbol) != -1) {
                            await useGetMFEPrices(tempExec, initEntryTime, initEntryPrice, trde)
                        }

                        trde.openPosition = false

                        if (openPositionsParse.length > 0) {
                            for (let index = 0; index < openPositionsParse.length; index++) {
                                const element = openPositionsParse[index];
                                if (element.symbol == trde.symbol && element.type == trde.type) {
                                    element.exitTime = tempExec.execTime;
                                }

                            }
                        }

                        for (let index = 0; index < temp2.length; index++) {
                            const element = temp2[index]
                            if (element.id == trde.id) {
                                element.exitTime = tempExec.execTime;
                                element.openPosition = false
                            }
                        }

                        newTrade = true
                        temp7 = {}

                        console.log("   ---> Position CLOSED")
                        openPosition = false

                    } else {
                        openPositionsFile.push(trde)
                        console.log("   ---> Position OPEN")

                    }
                } else {
                    console.log("nothing for key " + key2)
                }

            }

        }
        var c = _
            .chain(temp2)
            .orderBy(["entryTime"], ["asc"])
            .groupBy("td");
        for (let key in trades) delete trades[key]
        Object.assign(trades, JSON.parse(JSON.stringify(c)))
        resolve()
    })
}

export const useUpdateMfePrices = async(param99, param0, param2) => {
    return new Promise(async (resolve, reject) => {
        console.log("  --> Updating excursion DB with MFE price")
        for (let index = 0; index < mfePrices.length; index++) {
            const element = mfePrices[index];
            let parseObject
            let object
            if (param99 === "api") {
                let ParseNode = param0
                parseObject = ParseNode.Object.extend("excursions");
                object = new parseObject();
                object.set("user", { "__type": "Pointer", "className": "_User", "objectId": currentUser.value.objectId })
            } else {
                parseObject = Parse.Object.extend("excursions");
                object = new parseObject();
                object.set("user", Parse.User.current())

            }
            object.set("mfePrice", element.mfePrice)
            object.set("dateUnix", element.dateUnix)
            object.set("tradeId", element.tradeId)
            if (param99 === "api") {
                let ParseNode = param0
                const ACL = new ParseNode.ACL();
                ACL.setReadAccess(currentUser.value.objectId, true);
                ACL.setWriteAccess(currentUser.value.objectId, true);
                object.setACL(ACL);
            } else {
                object.setACL(new Parse.ACL(Parse.User.current()));
            }
            object.save(param99 === "api" ? { useMasterKey: true } : undefined)
                .then(async (object) => {
                    console.log(' -> Added new excursion with id ' + object.id)
                    tradeId.value = tradeExcursionId.value

                    if (index == (mfePrices.length - 1)) {
                        resolve()
                    }
                }, (error) => {
                    console.log('Failed to create new object, with error code: ' + error.message);
                    reject()
                })

        }
    })
}

async function filterExisting(param) {
    return new Promise(async (resolve, reject) => {
        console.log("\nFILTERING EXISTING")

        if (param == "trades") {
            existingTradesArray.forEach(element => {
                if (executions.hasOwnProperty(element)) {
                    console.log(" -> Already imported date " + element)
                    existingImports.push(element)
                }
            });

            let tempExecutions = _.omit(executions, existingTradesArray)
            for (let key in executions) delete executions[key]
            Object.assign(executions, tempExecutions)

            let tempTrades = _.omit(trades, existingTradesArray)
            for (let key in trades) delete trades[key]
            Object.assign(trades, tempTrades)
        }
        resolve()
    })
}

export async function useCreateBlotter(param) {
    return new Promise(async (resolve, reject) => {
        console.log("\nCREATING BLOTTER BY SYMBOL")
        let objectZ
        if (param) {
            let temp = _
                .chain(filteredTradesTrades)
                .orderBy(["entryTime"], ["asc"])
                .groupBy("td")
            objectZ = JSON.parse(JSON.stringify(temp))
        } else {
            objectZ = trades
        }

        const keys9 = Object.keys(objectZ);
        var temp10 = {}
        for (const key9 of keys9) {
            temp10[key9] = {}
            var tempExecs = objectZ[key9]
            var z = _
                .chain(tempExecs)
                .orderBy(["entryTime"], ["asc"])
                .groupBy("symbol")
            let objectY = JSON.parse(JSON.stringify(z))
            const keys10 = Object.keys(objectY);
            for (const key10 of keys10) {
                var tempExecs = objectY[key10]
                temp10[key9][key10] = {};

                var sumBuyQuantity = 0
                var sumSellQuantity = 0

                var sumCommission = 0
                var sumSec = 0
                var sumTaf = 0
                var sumNscc = 0
                var sumNasdaq = 0
                var sumOtherCommission = 0
                var sumFees = 0

                var sumGrossProceeds = 0
                var sumGrossWins = 0
                var sumGrossLoss = 0
                var sumGrossSharePL = 0
                var sumGrossSharePLWins = 0
                var sumGrossSharePLLoss = 0
                var highGrossSharePLWin = 0
                var highGrossSharePLLoss = 0

                var sumNetProceeds = 0
                var sumNetWins = 0
                var sumNetLoss = 0
                var sumNetSharePL = 0
                var sumNetSharePLWins = 0
                var sumNetSharePLLoss = 0
                var highNetSharePLWin = 0
                var highNetSharePLLoss = 0

                var sumExecutions = 0
                var sumTrades = 0
                var sumGrossWinsQuantity = 0
                var sumGrossLossQuantity = 0
                var sumGrossWinsCount = 0
                var sumGrossLossCount = 0
                var sumNetWinsQuantity = 0
                var sumNetLossQuantity = 0
                var sumNetWinsCount = 0
                var sumNetLossCount = 0



                tempExecs.forEach(element => {
                    sumBuyQuantity += element.buyQuantity
                    sumSellQuantity += element.sellQuantity
                    sumCommission += element.commission
                    sumSec += element.sec
                    sumTaf += element.taf
                    sumNscc += element.nscc
                    sumNasdaq += element.nasdaq
                    sumOtherCommission += element.sec + element.taf + element.nscc + element.nasdaq
                    sumFees += element.commission + element.sec + element.taf + element.nscc + element.nasdaq

                    sumGrossProceeds += element.grossProceeds
                    sumGrossWins += element.grossWins
                    sumGrossLoss += element.grossLoss
                    sumGrossSharePL += element.grossSharePL
                    sumGrossSharePLWins += element.grossSharePLWins
                    sumGrossSharePLLoss += element.grossSharePLLoss
                    if (element.grossSharePL >= 0) {
                        if (element.grossSharePL > highGrossSharePLWin) {
                            highGrossSharePLWin = element.grossSharePL
                        }
                    }
                    if (element.grossSharePL < 0) {
                        if (element.grossSharePL < highGrossSharePLLoss) {
                            highGrossSharePLLoss = element.grossSharePL
                        }

                    }

                    sumNetProceeds += element.netProceeds
                    sumNetWins += element.netWins
                    sumNetLoss += element.netLoss
                    sumNetSharePL += element.netSharePL
                    sumNetSharePLWins += element.netSharePLWins
                    sumNetSharePLLoss += element.netSharePLLoss
                    if (element.netSharePL >= 0) {
                        if (element.netSharePL > highNetSharePLWin) {
                            highNetSharePLWin = element.netSharePL
                        }

                    }
                    if (element.netSharePL < 0) {
                        if (element.netSharePL < highNetSharePLLoss) {
                            highNetSharePLLoss = element.netSharePL
                        }

                    }

                    sumExecutions += element.executionsCount
                    sumGrossWinsQuantity += element.grossWinsQuantity
                    sumGrossLossQuantity += element.grossLossQuantity
                    sumGrossWinsCount += element.grossWinsCount

                    sumNetWinsQuantity += element.netWinsQuantity
                    sumNetLossQuantity += element.netLossQuantity
                    sumNetWinsCount += element.netWinsCount
                    sumGrossLossCount += element.grossLossCount
                    sumNetLossCount += element.netLossCount
                    sumTrades += element.tradesCount

                })

                temp10[key9][key10].symbol = key10;
                temp10[key9][key10].type = tempExecs[0].type;
                temp10[key9][key10].buyQuantity = sumBuyQuantity
                temp10[key9][key10].sellQuantity = sumSellQuantity

                temp10[key9][key10].commission = sumCommission;
                temp10[key9][key10].sec = sumSec
                temp10[key9][key10].taf = sumTaf
                temp10[key9][key10].nscc = sumNscc
                temp10[key9][key10].nasdaq = sumNasdaq
                temp10[key9][key10].otherCommission = sumOtherCommission;
                temp10[key9][key10].fees = sumFees;

                temp10[key9][key10].grossProceeds = sumGrossProceeds;
                temp10[key9][key10].grossWins = sumGrossWins;
                temp10[key9][key10].grossLoss = sumGrossLoss;
                temp10[key9][key10].grossSharePL = sumGrossSharePL
                temp10[key9][key10].grossSharePLWins = sumGrossSharePLWins
                temp10[key9][key10].grossSharePLLoss = sumGrossSharePLLoss
                temp10[key9][key10].highGrossSharePLWin = highGrossSharePLWin;
                temp10[key9][key10].highGrossSharePLLoss = highGrossSharePLLoss;

                temp10[key9][key10].netProceeds = sumNetProceeds;
                temp10[key9][key10].netWins = sumNetWins;
                temp10[key9][key10].netLoss = sumNetLoss;
                temp10[key9][key10].netSharePL = sumNetSharePL
                temp10[key9][key10].netSharePLWins = sumNetSharePLWins
                temp10[key9][key10].netSharePLLoss = sumNetSharePLLoss
                temp10[key9][key10].highNetSharePLWin = highNetSharePLWin;
                temp10[key9][key10].highNetSharePLLoss = highNetSharePLLoss;

                temp10[key9][key10].executions = sumExecutions;
                temp10[key9][key10].trades = sumTrades;

                temp10[key9][key10].grossWinsQuantity = sumGrossWinsQuantity;
                temp10[key9][key10].grossLossQuantity = sumGrossLossQuantity;
                temp10[key9][key10].grossWinsCount = sumGrossWinsCount;
                temp10[key9][key10].grossLossCount = sumGrossLossCount;

                temp10[key9][key10].netWinsQuantity = sumNetWinsQuantity;
                temp10[key9][key10].netLossQuantity = sumNetLossQuantity;
                temp10[key9][key10].netWinsCount = sumNetWinsCount;
                temp10[key9][key10].netLossCount = sumNetLossCount;

            }

        }
        for (let key in blotter) delete blotter[key]
        Object.assign(blotter, temp10)
        resolve()
    })
}

export async function useCreatePnL() {
    return new Promise(async (resolve, reject) => {
        console.log("\nCREATING P&L")
        let objectQ = blotter
        const keys7 = Object.keys(objectQ);
        var temp9 = {}

        for (const key7 of keys7) {
            temp9[key7] = {};
            var tempExecs = objectQ[key7]
            var sumBuyQuantity = 0
            var sumSellQuantity = 0

            var sumCommission = 0
            var sumSec = 0
            var sumTaf = 0
            var sumNscc = 0
            var sumNasdaq = 0
            var sumOtherCommission = 0
            var sumFees = 0

            var sumGrossProceeds = 0
            var sumGrossWins = 0
            var sumGrossLoss = 0
            var sumGrossSharePL = 0
            var sumGrossSharePLWins = 0
            var sumGrossSharePLLoss = 0
            var highGrossSharePLWin = 0
            var highGrossSharePLLoss = 0

            var sumNetProceeds = 0
            var sumNetWins = 0
            var sumNetLoss = 0
            var sumNetSharePL = 0
            var sumNetSharePLWins = 0
            var sumNetSharePLLoss = 0
            var highNetSharePLWin = 0
            var highNetSharePLLoss = 0

            var sumExecutions = 0
            var sumTrades = 0

            var sumGrossWinsQuantity = 0
            var sumGrossLossQuantity = 0
            var sumGrossWinsCount = 0
            var sumGrossLossCount = 0

            var sumNetWinsQuantity = 0
            var sumNetLossQuantity = 0
            var sumNetWinsCount = 0
            var sumNetLossCount = 0


            const keys8 = Object.keys(tempExecs);
            for (const key8 of keys8) {
                sumBuyQuantity += tempExecs[key8].buyQuantity
                sumSellQuantity += tempExecs[key8].sellQuantity

                sumCommission += tempExecs[key8].commission
                sumSec += tempExecs[key8].sec
                sumTaf += tempExecs[key8].taf
                sumNscc += tempExecs[key8].nscc
                sumNasdaq += tempExecs[key8].nasdaq
                sumOtherCommission += tempExecs[key8].otherCommission
                sumFees += tempExecs[key8].fees

                sumGrossProceeds += tempExecs[key8].grossProceeds
                sumGrossWins += tempExecs[key8].grossWins
                sumGrossLoss += tempExecs[key8].grossLoss
                sumGrossSharePL += tempExecs[key8].grossSharePL
                sumGrossSharePLWins += tempExecs[key8].grossSharePLWins
                sumGrossSharePLLoss += tempExecs[key8].grossSharePLLoss
                if (tempExecs[key8].highGrossSharePLWin >= highGrossSharePLWin) {
                    highGrossSharePLWin = tempExecs[key8].highGrossSharePLWin
                }
                if (tempExecs[key8].highGrossSharePLLoss < highGrossSharePLLoss) {
                    highGrossSharePLLoss = tempExecs[key8].highGrossSharePLLoss
                }

                sumNetProceeds += tempExecs[key8].netProceeds
                sumNetWins += tempExecs[key8].netWins
                sumNetLoss += tempExecs[key8].netLoss
                sumNetSharePL += tempExecs[key8].netSharePL
                sumNetSharePLWins += tempExecs[key8].netSharePLWins
                sumNetSharePLLoss += tempExecs[key8].netSharePLLoss
                if (tempExecs[key8].highNetSharePLWin >= highNetSharePLWin) {
                    highNetSharePLWin = tempExecs[key8].highNetSharePLWin
                }

                if (tempExecs[key8].highNetSharePLLoss < highNetSharePLLoss) {
                    highNetSharePLLoss = tempExecs[key8].highNetSharePLLoss
                }

                sumExecutions += tempExecs[key8].executions
                sumTrades += tempExecs[key8].trades

                sumGrossWinsQuantity += tempExecs[key8].grossWinsQuantity
                sumGrossLossQuantity += tempExecs[key8].grossLossQuantity
                sumGrossWinsCount += tempExecs[key8].grossWinsCount
                sumGrossLossCount += tempExecs[key8].grossLossCount

                sumNetWinsQuantity += tempExecs[key8].netWinsQuantity
                sumNetLossQuantity += tempExecs[key8].netLossQuantity
                sumNetWinsCount += tempExecs[key8].netWinsCount
                sumNetLossCount += tempExecs[key8].netLossCount


            }
            temp9[key7].buyQuantity = sumBuyQuantity;
            temp9[key7].sellQuantity = sumSellQuantity;

            temp9[key7].commission = sumCommission;
            temp9[key7].sec = sumSec
            temp9[key7].taf = sumTaf
            temp9[key7].nscc = sumNscc
            temp9[key7].nasdaq = sumNasdaq
            temp9[key7].otherCommission = sumOtherCommission;
            temp9[key7].fees = sumFees;

            temp9[key7].grossProceeds = sumGrossProceeds;
            temp9[key7].grossWins = sumGrossWins;
            temp9[key7].grossLoss = sumGrossLoss;
            temp9[key7].grossSharePL = sumGrossSharePL
            temp9[key7].grossSharePLWins = sumGrossSharePLWins
            temp9[key7].grossSharePLLoss = sumGrossSharePLLoss
            temp9[key7].highGrossSharePLWin = highGrossSharePLWin;
            temp9[key7].highGrossSharePLLoss = highGrossSharePLLoss;

            temp9[key7].netProceeds = sumNetProceeds;
            temp9[key7].netWins = sumNetWins;
            temp9[key7].netLoss = sumNetLoss;
            temp9[key7].netSharePL = sumNetSharePL
            temp9[key7].netSharePLWins = sumNetSharePLWins
            temp9[key7].netSharePLLoss = sumNetSharePLLoss
            temp9[key7].highNetSharePLWin = highNetSharePLWin;
            temp9[key7].highNetSharePLLoss = highNetSharePLLoss;

            temp9[key7].executions = sumExecutions
            temp9[key7].trades = sumTrades

            temp9[key7].grossWinsQuantity = sumGrossWinsQuantity
            temp9[key7].grossLossQuantity = sumGrossLossQuantity
            temp9[key7].grossWinsCount = sumGrossWinsCount
            temp9[key7].grossLossCount = sumGrossLossCount

            temp9[key7].netWinsQuantity = sumNetWinsQuantity
            temp9[key7].netLossQuantity = sumNetLossQuantity
            temp9[key7].netWinsCount = sumNetWinsCount
            temp9[key7].netLossCount = sumNetLossCount


        }
        for (let key in pAndL) delete pAndL[key]
        Object.assign(pAndL, temp9)

        resolve()
    })
}

/* ---- 4: UPLOAD TO PARSE TRADES  ---- */
export async function useUploadTrades(param99, param0) {

    console.log("\nUPLOADING TRADES")
    spinnerLoadingPage.value = true

    let numberOfDates = 0
    let i = 0
    const uploadToParse = async (param1, param2, param3) => {
        return new Promise(async (resolve, reject) => {
            let parseObject
            let object
            if (param99 === "api") {
                let ParseNode = param0
                parseObject = ParseNode.Object.extend(param2);
                object = new parseObject();
                object.set("user", { "__type": "Pointer", "className": "_User", "objectId": currentUser.value.objectId })
            } else {
                parseObject = Parse.Object.extend(param2);
                object = new parseObject();
                object.set("user", Parse.User.current())
            }

            object.set("date", new Date(dayjs.unix(param1).format("YYYY-MM-DD")))
            object.set("dateUnix", Number(param1))
            object.set("openPositions", param3)
            if (param2 == "trades") {
                object.set("executions", executions[param1])
                object.set("trades", trades[param1])
                object.set("blotter", blotter[param1])
                object.set("pAndL", pAndL[param1])
            }
            if (param2 == "cashJournals") {
                object.set("cashJournal", cashJournals.value[param1])
            }
            if (param99 === "api") {
                let ParseNode = param0
                const ACL = new ParseNode.ACL();
                ACL.setReadAccess(currentUser.value.objectId, true);
                ACL.setWriteAccess(currentUser.value.objectId, true);
                object.setACL(ACL);
            } else {
                object.setACL(new Parse.ACL(Parse.User.current()));
            }

            object.save(param99 === "api" ? { useMasterKey: true } : undefined)
                .then((object) => {

                    console.log(" -> Added new " + param2 + " with id " + object.id)
                    i++
                    if (i == numberOfDates) {
                        resolve("resolve")
                    } else {
                        resolve()
                    }

                }, (error) => {
                    console.log('Failed to create new trade, with error code: ' + error.message);
                    spinnerLoadingPage.value = false
                });
        })
    }


    const uploadFunction = async (param) => {
        return new Promise(async (resolve, reject) => {
            let keys
            i = 0
            numberOfDates = 0

            if (param == "trades") {
                keys = Object.keys(executions)
                numberOfDates = Object.keys(executions).length
            }
            if (param == "cashJournals") {
                keys = Object.keys(cashJournals.value)
                numberOfDates = Object.keys(cashJournals.value).length
            }
            console.log("num of dates " + numberOfDates)
            for (const key of keys) {
                let checkIfOpenPositions = trades[key].findIndex(x => x.openPosition == true)

                checkIfOpenPositions != -1 ? checkIfOpenPositions = true : checkIfOpenPositions = false
                const promise = await uploadToParse(key, param, checkIfOpenPositions)
                if (promise == "resolve") resolve()
            }
        })
    }

    const checkTradeAccounts = async () => {
        return new Promise(async (resolve, reject) => {
            const updateTradeAccounts = async (param, param2) => {
                let parseObject
                let query
                if (param99 === "api") {
                    let ParseNode = param0
                    parseObject = ParseNode.Object.extend("_User");
                    query = new ParseNode.Query(parseObject);
                } else {
                    parseObject = Parse.Object.extend("_User");
                    query = new Parse.Query(parseObject);
                }

                query.equalTo("objectId", currentUser.value.objectId);
                const results = await query.first(param99 === "api" ? { useMasterKey: true } : undefined);
                if (results) {
                    results.set("accounts", param)
                    if (param99 === "api") {
                        await results.save(null, { useMasterKey: true })
                    } else {
                        await results.save()

                        let selectedItems = "selectedAccounts"

                        let selectedItemsArray = []
                        if (localStorage.getItem(selectedItems)) {
                            if (localStorage.getItem(selectedItems).includes(",")) {
                                selectedItemsArray = localStorage.getItem(selectedItems).split(",")
                            } else {
                                selectedItemsArray = []
                                selectedItemsArray.push(localStorage.getItem(selectedItems))
                            }
                        } else {
                            selectedItemsArray = []
                        }
                        selectedItemsArray.push(param2)
                        localStorage.setItem(selectedItems, selectedItemsArray)
                    }
                } else {
                    alert("Update query did not return any results")
                }
            }

            if (currentUser.value.accounts) {
                tradeAccounts.forEach(element => {
                    let check = currentUser.value.accounts.find(x => x.value == element)
                    if (!check) {
                        let tempArray = currentUser.value.accounts
                        let temp = {}
                        temp.value = tradeAccounts[0]
                        temp.label = tradeAccounts[0]
                        tempArray.push(temp)
                        updateTradeAccounts(tempArray, temp.value)
                    }
                });
            } else {
                let tempArray = []
                tradeAccounts.forEach(element => {
                    let temp = {}
                    temp.value = element
                    temp.label = element
                    tempArray.push(temp)
                    updateTradeAccounts(tempArray, temp.value)
                })
            }
        })
    }

    const updateOpenPositions = async (param1, param2, param3) => {
        return new Promise(async (resolve, reject) => {
            console.log(" -> Updating open position " + param1 + " from " + param2)
            let parseObject
            let query
            if (param99 === "api") {
                let ParseNode = param0
                parseObject = ParseNode.Object.extend("trades");
                query = new ParseNode.Query(parseObject);
                query.equalTo("user", { "__type": "Pointer", "className": "_User", "objectId": currentUser.value.objectId })
            } else {
                parseObject = Parse.Object.extend("trades");
                query = new Parse.Query(parseObject);
            }

            query.equalTo("dateUnix", param2);

            const results = await query.first(param99 === "api" ? { useMasterKey: true } : undefined);
            if (results) {
                let parsedRes = JSON.parse(JSON.stringify(results))

                let openPositions = false

                let tempTrades = parsedRes.trades
                let openPositionIndex = tempTrades.findIndex(x => x.id == param1)
                if (openPositionIndex != -1) {
                    tempTrades[openPositionIndex].openPosition = false
                    tempTrades[openPositionIndex].exitTime = param3
                }
                for (let index = 0; index < tempTrades.length; index++) {
                    const element = tempTrades[index];
                    if (element.openPosition) {
                        openPositions = true
                    }
                }
                results.set("openPositions", openPositions)
                results.set("trades", tempTrades)
                if (param99 === "api") {
                    await results.save(null, { useMasterKey: true }).then(resolve())
                } else {
                    await results.save().then(resolve())
                }

            } else {
                alert("Update query did not return any results")
            }
        })
    }

    checkTradeAccounts()


    const loopOpenPositionsParse = async (param1, param2) => {
        return new Promise(async (resolve, reject) => {
            for (let index = 0; index < openPositionsParse.length; index++) {
                const element = openPositionsParse[index];
                console.log(" element id "+JSON.stringify(element.id))
                console.log(" element exit time "+JSON.stringify(element.exitTime))
                
                if(element.exitTime != 0){
                    await updateOpenPositions(element.id, element.td, element.exitTime)
                }

                if ((index + 1) == openPositionsParse.length) {
                    resolve()
                }
            }
        })
    }

    if (Object.keys(executions).length > 0) await uploadFunction("trades")
    if (Object.keys(executions).length > 0 && mfePrices.length > 0) await useUpdateMfePrices(param99, param0)
    if (openPositionsParse.length > 0) {
        await loopOpenPositionsParse()
    }
    if (param99 == "api") {
        for (let key in executions) delete executions[key]
        for (let key in executions) delete executions[key]
        for (let key in trades) delete trades[key]
        for (let key in blotter) delete blotter[key]
        for (let key in pAndL) delete pAndL[key]

        tradesData.length = 0

        existingTradesArray.length = 0 // reinitialize, for API
        tempExecutions.length = 0 // reinitialize, for API
        tradedSymbols.length = 0 // reinitialize, for API
        ohlcv.length = 0 // reinitialize, for API
        openPositionsParse.length = 0 // reinitialize, for API
        mfePrices.length = 0 // reinitialize, for API
        openPositionsFile.length = 0 // reinitialize, for API

    }
    else {
        window.location.href = "/dashboard"
    }

}
