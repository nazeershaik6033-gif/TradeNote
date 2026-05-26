import { selectedMonth, pageId, screenshots, screenshot, tradeScreenshotChanged, dateScreenshotEdited, renderData, markerAreaOpen, spinnerLoadingPage, spinnerSetups, editingScreenshot, timeZoneTrade, endOfList, screenshotsPagination, screenshotsQueryLimit, selectedItem, saveButton, resizeCompressImg, resizeCompressMaxWidth, resizeCompressMaxHeight, resizeCompressQuality, expandedScreenshot, expandedId, expandedSource, selectedScreenshot, selectedScreenshotIndex, selectedScreenshotSource, tags, selectedTags, tradeTags, screenshotsInfos } from '../stores/globals.js'
import { useLoadMore } from './utils.js';
import { useUpdateTags, useUpdateAvailableTags} from './daily.js';

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
import * as markerjs2 from 'markerjs2';


screenshotsQueryLimit.value = 4

export function useGetScreenshotsPagination() {
    if (sessionStorage.getItem('screenshotsPagination')) {
        screenshotsQueryLimit.value = Number(sessionStorage.getItem('screenshotsPagination'))
        sessionStorage.removeItem('screenshotsPagination');
    }
}

export async function useGetScreenshots(param1, param2) {
    //param1 : true if page != screenshots and false if page == screenshots
    //param2 : if exists, it's the the unixDate of the day on daily when either clicked on Screenshots Tab or to open modal
    console.log("\nGETTING SCREENSHOTS")

    return new Promise(async (resolve, reject) => {
        const parseObject = Parse.Object.extend("screenshots");
        const query = new Parse.Query(parseObject);
        query.equalTo("user", Parse.User.current());
        query.descending("dateUnix");
        query.exclude("original", "annotated");

        if (param1) { // if param1 == true then we're not on screenshots page
            if(!param2){
                console.log("  --> Getting Screenshots Infos")
                screenshotsInfos.length = 0
                query.greaterThanOrEqualTo("dateUnix", selectedMonth.value.start)
                query.lessThanOrEqualTo("dateUnix", selectedMonth.value.end)
                query.exclude("originalBase64", "annotatedBase64", "maState");
            }else{
                console.log("  --> Getting full Screenshots data")
                query.equalTo("dateUnixDay", param2)
            }
        }

        // if param1 inexistant or = false then we're on screenshots page
        else {
            query.limit(screenshotsQueryLimit.value);
            query.skip(screenshotsPagination.value)
        }


        await query.find().then(async (results) => {
            if (results.length > 0) {
                let parsedResult = JSON.parse(JSON.stringify(results))
                if (pageId.value == "daily") {
                    screenshots.length = 0
                }

                parsedResult.forEach(element => {
                    let tradeTagsSelected = false
                    let selectedTagsArray = Object.values(selectedTags.value)
                    let index = tags.findIndex(obj => obj.tradeId == element.name)
                    if (index != -1) {
                        if (selectedTagsArray.some(value => tags[index].tags.find(obj => obj === value))) {
                            tradeTagsSelected = true
                        } else {
                            if (selectedTagsArray.includes("t000t")) {
                                tradeTagsSelected = true
                            } else {
                                //
                            }
                        }
                    } else {
                        if (selectedTagsArray.includes("t000t")) {
                            tradeTagsSelected = true
                        }
                    }

                    const pushScreenshots = () => {
                        if (!param1 || param2) {
                            screenshots.push(element)
                        }

                        else{
                            let temp = {}
                            temp.objectId = element.objectId
                            temp.dateUnix = element.dateUnix
                            temp.dateUnixDay = element.dateUnixDay
                            temp.name = element.name
                            screenshotsInfos.push(temp)
                        }
                    }

                    if (pageId.value == "daily") {
                        pushScreenshots()
                    } else {
                        if (tradeTagsSelected) {
                            pushScreenshots()
                        }
                    }
                })

            } else {
                if (pageId.value == "screenshots") {
                    endOfList.value = true
                }
            }


            screenshotsPagination.value = screenshotsPagination.value + screenshotsQueryLimit.value

            spinnerSetups.value = false
            if (pageId.value != "daily") {
                await (spinnerLoadingPage.value = false)
            }


        }).then(() => {
            if (sessionStorage.getItem('screenshotIdToEdit') && pageId.value == "screenshots") useScrollToScreenshot()
            resolve()
        })

    })
}

export function useScrollToScreenshot() {
    let element = document.getElementById(sessionStorage.getItem('screenshotIdToEdit'))
    if (element) {
        element.scrollIntoView()
    }
    sessionStorage.removeItem('screenshotIdToEdit');
}

async function imgFileReader(param) {
    return new Promise(async (resolve, reject) => {
        let reader = new FileReader();
        reader.readAsDataURL(param);
        reader.onloadend = () => {
            let base64data = reader.result
            console.log("  --> Img size " + parseFloat(((base64data.length * 6) / 8) / 1000).toFixed(2) + " KB")
            screenshot.originalBase64 = base64data
            screenshot.annotatedBase64 = base64data
            screenshot.extension = base64data.substring(base64data.indexOf('/') + 1, base64data.indexOf(';base64'))
            renderData.value += 1
            resolve()
        }
    })
}

export async function useSetupImageUpload(event, param1, param2, param3) {
    tradeScreenshotChanged.value = true
    if (pageId.value == "daily") {
        saveButton.value = true
        dateScreenshotEdited.value = true

        screenshot.dateUnix = param1
        screenshot.symbol = param2
        screenshot.side = param3

    }
    const file = event.target.files[0];

    await imgFileReader(file).then(() => {
        if (resizeCompressImg.value) {
            const originalImage = document.querySelector("#screenshotDiv");
            compressImage(originalImage);
        }
    })

}

let originalWidth
let originalHeight
let newWidth
let newHeight

export async function compressImage(imgToCompress) {
    console.log("\nRESIZING AND COMPRESSING IMAGE")
    originalWidth = imgToCompress.naturalWidth
    originalHeight = imgToCompress.naturalHeight
    console.log("  --> Original width " + originalWidth)
    console.log("  --> Original height " + originalHeight)

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (originalWidth > originalHeight) {
        if (originalWidth > resizeCompressMaxWidth.value) {
            newHeight = originalHeight * (resizeCompressMaxWidth.value / originalWidth);
            newWidth = resizeCompressMaxWidth.value;
        }
    } else {
        if (originalHeight > resizeCompressMaxHeight.value) {
            newWidth = originalWidth * (resizeCompressMaxHeight.value / originalHeight);
            newHeight = resizeCompressMaxHeight.value;
        }
    }
    canvas.width = Math.floor(newWidth * window.devicePixelRatio);
    canvas.height = Math.floor(newHeight * window.devicePixelRatio);
    console.log("canvas.width " + canvas.width)
    console.log("canvas.height " + canvas.height)
    context.scale(window.devicePixelRatio, window.devicePixelRatio);

    console.log(" -> Resizing")
    context.drawImage(
        imgToCompress,
        0,
        0,
        newWidth,
        newHeight
    );

    console.log(" -> Compressing")
    canvas.toBlob(
        (blob) => {
            if (blob) {
                imgFileReader(blob)
            }
        },
        "image/png",
        resizeCompressQuality.value
    );
}

export function useSetupMarkerArea(param1, param2) {
    let elId

    if (param1 == "dailyTab" || param1 == "screenshots") {
        for (let key in screenshot) delete screenshot[key]
        Object.assign(screenshot, JSON.parse(JSON.stringify(param2)))
    }

    screenshot.objectId ? elId = "screenshotDiv-" + param1 + '-' + screenshot.objectId : elId = "screenshotDiv-" + param1 + '-' + screenshot.dateUnix

    let markerAreaId = document.getElementById(elId);
    console.log("elId " + elId)
    console.log("  --> Width " + markerAreaId.naturalWidth)
    console.log("  --> Height " + markerAreaId.naturalHeight)

    const markerArea = new markerjs2.MarkerArea(markerAreaId);
    markerArea.renderAtNaturalSize = true;
    markerArea.renderImageQuality = 1;
    markerArea.renderMarkersOnly = true
    markerArea.settings.displayMode = 'popup';

    markerArea.availableMarkerTypes = markerArea.ALL_MARKER_TYPES;
    markerArea.settings.defaultFillColor = "#ffffffde"
    markerArea.settings.defaultStrokeColor = "black"
    markerArea.settings.defaultColorsFollowCurrentColors = true
    markerArea.settings.defaultStrokeWidth = 2
    markerArea.settings.defaultColor = "white"

    if (pageId.value == "daily") {
        markerArea.addEventListener('markercreating', event => {
            if (param1 == "dailyModal") {
                document.getElementById("tradesModal").style.display = "none";
            }
        })

        markerArea.addEventListener('markerselect', event => {
            if (param1 == "dailyModal") {
                document.getElementById("tradesModal").style.display = "none";
            }
        })
    }

    markerArea.addEventListener('render', event => {
        console.log("render")
        if (param1 == "dailyModal") {
            document.getElementById("tradesModal").style.display = "block";
            tradeScreenshotChanged.value = true
            dateScreenshotEdited.value = true
            saveButton.value = true

        }

        console.log("  --> Marker img size " + parseFloat(((event.dataUrl.length * 6) / 8) / 1000).toFixed(2) + " KB")

        markerAreaOpen.value = false


        screenshot.annotatedBase64 = event.dataUrl
        screenshot.maState = event.state

        if (param1 == "dailyTab" || param1 == "screenshots") {
            let index = screenshots.findIndex(obj => obj.dateUnix == screenshot.dateUnix)
            screenshots[index].annotatedBase64 = event.dataUrl
            screenshots[index].maState = event.state
            useSaveScreenshot()
        }

        renderData.value += 1
    })

    markerArea.addEventListener('close', event => {
        if (param1 == "dailyModal") {
            document.getElementById("tradesModal").style.display = "block";
        }
        markerAreaOpen.value = false
    })

    markerArea.show();
    if (markerArea.isOpen) {
        markerAreaOpen.value = true
    }

    if (screenshot.maState) {
        markerArea.restoreState(screenshot.maState)
    }
}

export function useExpandScreenshot(param1, param2) {
    if (param2) {
        expandedScreenshot.value = param2.objectId
        if (param1 == "dailyTab") {
            for (let key in screenshot) delete screenshot[key]
            Object.assign(screenshot, JSON.parse(JSON.stringify(param2)))
        }
        if (param1 == 'dailyTab' || param1 == 'screenshots') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            document.body.style.overflow = 'hidden'
        }
        expandedSource.value = param1
        expandedId.value = 'screenshotDiv-' + param1 + '-' + param2.objectId
    } else {//case when we close the fullscreen mode
        if (expandedSource.value == 'dailyTab' || expandedSource.value == 'screenshots') {
            document.body.style.overflow = 'visible'
            let id = document.getElementById(expandedId.value);
            id.scrollIntoView({ behavior: 'smooth' }, true);
        }
        expandedScreenshot.value = null
        expandedSource.value = null
        expandedId.value = null
    }
}

export async function useSaveScreenshot() {
    console.log("\nSAVING SCREENSHOT")
    return new Promise(async (resolve, reject) => {

        if (markerAreaOpen.value == true) {
            alert("Please save your screenshot annotation")
            return
        }

        if (pageId.value == "addScreenshot") {
            if (screenshot.symbol == undefined) {
                alert("Please add symbol")
                return
            }
            if (!editingScreenshot.value && tradeScreenshotChanged.value == false) {
                alert("Please add a screenshot")
                return
            }
        }

        if (pageId.value == "addScreenshot") {
            spinnerLoadingPage.value = true
            if (!editingScreenshot.value || (editingScreenshot.value && dateScreenshotEdited.value)) {
                screenshot.dateUnix = dayjs.tz(screenshot.date, timeZoneTrade.value).unix()
            }
        }

        if (editingScreenshot.value && !dateScreenshotEdited.value) {
            //we do nothing
        }

        if (editingScreenshot.value) {
            screenshot.extension = screenshot.originalBase64.substring(screenshot.originalBase64.indexOf('/') + 1, screenshot.originalBase64.indexOf(';base64'))
        }

        screenshot.side ? screenshot.name = "t" + screenshot.dateUnix + "_" + screenshot.symbol + "_" + screenshot.side : screenshot.name = screenshot.dateUnix + "_" + screenshot.symbol

        console.log(" tradeTags " + JSON.stringify(tradeTags))
        if (!editingScreenshot.value && tradeTags.length == 0) {
            await useUploadScreenshotToParse()
        } else {
            await Promise.all([useUpdateAvailableTags(), useUpdateTags()])
            await useUploadScreenshotToParse()
        }

        resolve()
    })
}

export async function useUploadScreenshotToParse() {
    return new Promise(async (resolve, reject) => {
        console.log(" -> Uploading to database")

        const parseObject = Parse.Object.extend("screenshots");
        const query = new Parse.Query(parseObject);
        query.equalTo("objectId", screenshot.objectId);

        const results = await query.first();
        if (results) {
            console.log(" -> Updating")
            results.set("name", screenshot.name)
            results.set("symbol", screenshot.symbol)
            results.set("side", screenshot.side)
            results.set("originalBase64", screenshot.originalBase64)
            results.set("annotatedBase64", screenshot.annotatedBase64)
            results.set("markersOnly", true)
            results.set("maState", screenshot.maState)
            if (dateScreenshotEdited.value) {
                results.set("date", new Date(dayjs.unix(screenshot.dateUnix).tz(timeZoneTrade.value).format("YYYY-MM-DDTHH:mm:ss")))
                results.set("dateUnix", Number(screenshot.dateUnix))
                results.set("dateUnixDay", dayjs(screenshot.dateUnix * 1000).tz(timeZoneTrade.value).startOf("day").unix())
            }
            results.save().then(async () => {
                console.log(' -> Updated screenshot with id ' + results.id)
                if (pageId.value == "addScreenshot") {
                    window.location.href = "/screenshots"
                }

                if (pageId.value == "daily") {
                    await useGetScreenshots(true, dayjs(screenshot.dateUnix * 1000).tz(timeZoneTrade.value).startOf("day").unix())
                    await useGetScreenshots(true)
                    const file = document.querySelector('.screenshotFile');
                    if (file) file.value = '';
                }
                resolve()

            }, (error) => {
                console.log('Failed to update new object, with error code: ' + error.message);
                spinnerLoadingPage.value = false
            })

        } else {
            console.log(" -> Saving")

            const object = new parseObject();
            object.set("user", Parse.User.current())
            object.set("name", screenshot.name)
            object.set("symbol", screenshot.symbol)
            object.set("side", screenshot.side)
            object.set("originalBase64", screenshot.originalBase64)
            object.set("annotatedBase64", screenshot.annotatedBase64)
            object.set("markersOnly", true)
            object.set("maState", screenshot.maState)
            object.set("date", new Date(dayjs.unix(screenshot.dateUnix).tz(timeZoneTrade.value).format("YYYY-MM-DDTHH:mm:ss")))
            object.set("dateUnix", Number(screenshot.dateUnix))
            object.set("dateUnixDay", dayjs(screenshot.dateUnix * 1000).tz(timeZoneTrade.value).startOf("day").unix())

            object.setACL(new Parse.ACL(Parse.User.current()));

            object.save()
                .then(async (object) => {
                    console.log('  --> Added new screenshot with id ' + object.id)
                    if (pageId.value == "addScreenshot") {
                        window.location.href = "/screenshots"
                    }
                    if (pageId.value == "daily") {
                        await useGetScreenshots(true, dayjs(screenshot.dateUnix * 1000).tz(timeZoneTrade.value).startOf("day").unix())
                        await useGetScreenshots(true)
                        const file =
                            document.querySelector('.screenshotFile');
                        file.value = '';
                    }
                    resolve()


                }, (error) => {
                    console.log('Failed to create new object, with error code: ' + error.message);
                    spinnerLoadingPage.value = false
                });

        }
    })
}

export async function useDeleteScreenshot(param1, param2) {
    console.log(" -> Selected item " + selectedItem.value)

    const parseObject = Parse.Object.extend("screenshots");
    const query = new Parse.Query(parseObject);
    query.equalTo("objectId", selectedItem.value);
    const results = await query.first();

    if (results) {
        await results.destroy()
        console.log('  --> Deleted screenshot with id ' + results.id)
        if (pageId.value == 'screenshots') {
            await useRefreshScreenshot()
        }
        if (pageId.value == 'daily') {
            let index = screenshots.findIndex(obj => obj.objectId == selectedItem.value)
            for (let key in screenshots[index]) delete screenshots[index][key]
            for (let key in screenshot) delete screenshot[key]
            selectedItem.value = null
        }
    } else {
        alert("There was a problem with the query")
    }
}

export async function useRefreshScreenshot() {
    return new Promise(async (resolve, reject) => {
        await (spinnerLoadingPage.value = true)
        screenshotsQueryLimit.value = 4
        screenshotsPagination.value = 0
        screenshots.length = 0
        await useGetScreenshots(false)
        selectedItem.value = null
        resolve()
    })
}

export async function useSelectedScreenshotFunction(param1, param2, param3) {
    selectedScreenshotIndex.value = param1
    selectedScreenshotSource.value = param2
    if (param1 && ((param1 + 2) == screenshots.length) && !endOfList.value) {
        useLoadMore()
    }


    if (param1 >= 0) {
        for (let key in selectedScreenshot) delete selectedScreenshot[key]
        Object.assign(selectedScreenshot, screenshots[param1])
    }
    else {
        Object.assign(selectedScreenshot, param3)
    }
}