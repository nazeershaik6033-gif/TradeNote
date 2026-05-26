import express from 'express';
import { ParseServer } from 'parse-server'
//var ParseDashboard = require('parse-dashboard');
import ParseNode from 'parse/node.js'
import path from 'path'
import fs from 'fs'
import axios from 'axios'
import * as Vite from 'vite'
import { MongoClient } from "mongodb"
import Proxy from 'http-proxy'
import { useImportTrades, useGetExistingTradesArray, useUploadTrades } from './src/utils/addTrades.js';
import { currentUser, uploadMfePrices } from './src/stores/globals.js';
import { useGetTimeZone } from './src/utils/utils.js';

let databaseURI

if (process.env.MONGO_URI) {
    databaseURI = process.env.MONGO_URI
} else if (process.env.MONGO_ATLAS) {
    databaseURI = "mongodb+srv://" + process.env.MONGO_USER + ":" + process.env.MONGO_PASSWORD + "@" + process.env.MONGO_URL + "/" + process.env.TRADENOTE_DATABASE + "?authSource=admin"
} else {
    databaseURI = "mongodb://" + process.env.MONGO_USER + ":" + process.env.MONGO_PASSWORD + "@" + process.env.MONGO_URL + ":" + process.env.MONGO_PORT + "/" + process.env.TRADENOTE_DATABASE + "?authSource=admin"
}

console.log("\nCONNECTING TO MONGODB")
let hiddenDatabaseURI = databaseURI.replace(/:\/\/[^@]*@/, "://***@")
console.log(' -> Database URI ' + hiddenDatabaseURI)

let tradenoteDatabase = process.env.TRADENOTE_DATABASE

var app = express();
app.use(express.json());

const port = process.env.TRADENOTE_PORT;
const PROXY_PORT = 39482;

// SERVER

let server = null

export let allowRegister = false


/**************************** APIs ****************************/

const setupApiRoutes = (app) => {

    app.post("/api/parseAppId", (req, res) => {
        res.send(process.env.APP_ID)
    });

    app.post("/api/registerPage", (req, res) => {
        res.send(process.env.REGISTER_OFF)
    });

    app.post("/api/posthog", (req, res) => {
        if (process.env.ANALYTICS_OFF) {
            res.send("off")
        } else {
            res.send("phc_FxkjH1O898jKu0yiELC3aWKda3vGov7waGN0weU5kw0")
        }
    });

    app.post("/api/checkCloudPayment", async (req, res) => {
        res.status(200).send('OK');
    });

    app.get('/api/dockerVersion', async (req, res) => {
            console.log("Getting Docker Version");
            await axios.get("https://hub.docker.com/v2/namespaces/eleventrading/repositories/tradenote/tags")
            .then((response) => {
                res.status(200).send(response.data);
            })
            .catch((error) => {
                res.status(500).send({ error: error.message });
            })
            .finally(function () {
                // always executed
            })
    });

    app.post("/api/updateSchemas", async (req, res) => {

        if (true) {
            console.log("\nAPI : post update schema")

            let rawdata = fs.readFileSync('requiredClasses.json');
            let schemasJson = JSON.parse(rawdata);

            let existingSchema = []
            const getExistingSchema = await ParseNode.Schema.all()

            /* 1- Rename legacy names in mongoDB */
            const renameMongoDb = (param1, param2) => {
                return new Promise(async (resolve, reject) => {
                    console.log(" -> Renaming class " + param1 + " to " + param2)
                    MongoClient.connect(databaseURI).then(async (client) => {
                        console.log("  --> Connected to MongoDB")
                        const connect = client.db(tradenoteDatabase);
                        const allCollections = await connect.listCollections().toArray()
                        let collectionExists = allCollections.filter(obj => obj.name == param1)
                        if (collectionExists.length > 0) {
                            const collection = connect.collection(param1);
                            collection.rename(param2).then(() => {
                                console.log(" -> Renamed class successfully");
                                resolve()
                            })
                        } else {
                            console.log(" -> Collection doesn't exist.")
                            resolve()
                        }

                    }).catch((err) => {
                        console.log(" -> Error renaming MongoDB class: " + err.Message);
                        reject()
                    })
                })
            }

            for (let i = 0; i < getExistingSchema.length; i++) {
                if (getExistingSchema[i].className == "setupsEntries" || getExistingSchema[i].className == "journals") {
                    let oldName = getExistingSchema[i].className
                    let newName

                    if (getExistingSchema[i].className == "setupsEntries") newName = "screenshots"
                    if (getExistingSchema[i].className == "journals") newName = "diaries"
                    if (getExistingSchema[i].className == "patternsMistakes") newName = "setups"

                    await renameMongoDb(oldName, newName)
                } else {
                    existingSchema.push(getExistingSchema[i].className)
                }
            }

            /* 2- Update or save new schemas in mongoDB */
            const updateSaveSchema = (param1, param2, param3) => {
                return new Promise((resolve, reject) => {
                    const mySchema = new ParseNode.Schema(param1);
                    if (param2[param3].type === "String") mySchema.addString(param3)
                    if (param2[param3].type === "Number") mySchema.addNumber(param3)
                    if (param2[param3].type === "Boolean") mySchema.addBoolean(param3)
                    if (param2[param3].type === "Date") mySchema.addDate(param3)
                    if (param2[param3].type === "File") mySchema.addFile(param3)
                    if (param2[param3].type === "GeoPoint") mySchema.addGeoPoint(param3)
                    if (param2[param3].type === "Polygon") mySchema.addPolygon(param3)
                    if (param2[param3].type === "Array") mySchema.addArray(param3)
                    if (param2[param3].type === "Object") mySchema.addObject(param3)
                    if (param2[param3].type === "Pointer") mySchema.addPointer(param3, param2[param3].targetClass)
                    if (param2[param3].type === "Relation") mySchema.addRelation(param3, param2[param3].targetClass)

                    if (existingSchema.includes(param1)) {
                        mySchema.update().then((result) => {
                            console.log("  --> Updating field " + param3)
                            resolve()
                        })
                    } else {
                        mySchema.save().then((result) => {
                            console.log("  --> Saving field " + param3)
                            existingSchema.push(param1)
                            resolve()
                        })
                    }
                })
            }

            for (let i = 0; i < schemasJson.length; i++) {
                let className = schemasJson[i].className
                console.log(" -> Upsert class/collection " + className + " in ParseNode Schema")
                let obj = schemasJson[i].fields
                for (const key of Object.keys(obj)) {
                    if (key != "objectId" && key != "updatedAt" && key != "createdAt" && key != "ACL") {
                        await updateSaveSchema(className, obj, key)
                    }
                }
            }

            res.send({ "existingSchema": existingSchema })
        } else {
            res.status(200).send('OK');
        }

    })

    app.use(express.json());

    let allUsers
    const getAllUsers = async () => {
        console.log(" -> Getting all users")
        return new Promise(async (resolve, reject) => {
            const parseObject = ParseNode.Object.extend("_User");
            const query = new ParseNode.Query(parseObject);
            const results = await query.find({ useMasterKey: true });
            allUsers = JSON.parse(JSON.stringify(results))
            resolve()
        })
    }

    const validateApiKey = async (req, res, next) => {
        await getAllUsers()
        const targetKey = req.headers['api-key'] || req.query['api-key'];

        const checkIPKey = (allUsers, targetKey) => {
            for (const user of Object.values(allUsers)) {
                if (user.hasOwnProperty("apis")) {
                    const index = user.apis.findIndex(obj => obj.key === targetKey);
                    if (index !== -1) {
                        currentUser.value = user
                        return true;
                    }
                }
            }
            return -1;
        }

        const hasIPKey = checkIPKey(allUsers, targetKey);

        if (hasIPKey) {
            console.log(" -> Valid api key found :)")
            next();
        } else {
            console.log(" -> Invalid api key")
            return res.status(401).send({ error: 'Invalid API key' });
        }
    }

    app.post('/api/trades', validateApiKey, async (req, res) => {
        const data = req.body;
        try {
            if (data && !data.data.length > 0) {
                res.status(200).send(" -> No trades to import");
            }
            else {
                uploadMfePrices.value = data.uploadMfePrices
                await useGetTimeZone()
                await useGetExistingTradesArray("api", ParseNode)
                await useImportTrades(data.data, "api", data.selectedBroker, ParseNode)
                await useUploadTrades("api", ParseNode)
                res.status(200).send(" -> Saved Trades to ParseNode DB");
            }
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: 'Error creating executions' });
        }
    });

    app.post('/api/databento', async (req, res) => {
        const data = req.body;
        try {
            const username = data.username;
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

            let responseBack
            axios.request(config)
                .then((response) => {
                    responseBack = response.data
                    res.status(200).send(responseBack);
                })
                .catch((error) => {
                    console.log(error);
                    res.status(500).send({ error: error });
                });

        } catch (error) {
            console.error(error);
            res.status(500).send({ error: error });
        }
    })
};

/**************************** END APIs ****************************/

const startIndex = async () => {

    const startServer = async () => {
        console.log("\nSTARTING NODEJS SERVER")
        return new Promise(async (resolve, reject) => {
            server = app.listen(port, function () {
                console.log(' -> TradeNote server started on http://localhost:' + port)
            });
            resolve(server)
        })
    }

    const runServer = async () => {
        console.log("\nRUNNING SERVER");
    
        return new Promise(async (resolve, reject) => {
            if (process.env.NODE_ENV == 'dev') {
                const proxy = new Proxy.createProxyServer({
                    target: { host: 'localhost', port: PROXY_PORT },
                });
    
                app.use('/api/*', (req, res, next) => {
                    next();
                });
    
                setupApiRoutes(app);
    
                app.use((req, res, next) => {
                    if (req.url.startsWith('/api/')) {
                        return next();
                    }
                    proxy.web(req, res);
                });
    
                const vite = await Vite.createServer({ server: { port: PROXY_PORT } });
                vite.listen();
                console.log(" -> Running vite dev server");
                resolve();
            } else {
                app.use('/api/*', express.json(), (req, res, next) => {
                    next();
                });
    
                setupApiRoutes(app);
    
                app.use(express.static('dist'));
    
                app.get('*', (req, res) => {
                    res.sendFile(path.resolve('dist', 'index.html'));
                });
                console.log(" -> Running prod server");
                resolve();
            }
        });
    };
    

    const setupParseServer = async () => {
        console.log("\nSTARTING PARSE SERVER")
        return new Promise(async (resolve, reject) => {
            const serv = new ParseServer({
                databaseURI: databaseURI,
                appId: process.env.APP_ID,
                masterKey: process.env.MASTER_KEY,
                port: port,
                masterKeyIps: ['0.0.0.0/0', '::/0'],
                allowClientClassCreation: false,
                allowExpiredAuthDataToken: false
            });

            await serv.start().then(() => {
                app.use('/parse', serv.app);
                console.log(" -> ParseNode server started")
                resolve()
            })
        })
    }

    await startServer()
    await runServer()

    try {
        await setupParseServer()
        ParseNode.initialize(process.env.APP_ID)
        ParseNode.serverURL = "http://localhost:" + port + "/parse"
        ParseNode.masterKey = process.env.MASTER_KEY
        if (process.env.PARSE_DASHBOARD) app.use('/parseDashboard', parseDashboard)
    } catch (err) {
        console.error('\n -> Parse Server failed to start: ' + err.message)
        console.error(' -> The frontend will still be served, but login/data features require a working MongoDB connection.')
    }

}
startIndex()
