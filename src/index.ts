import e from "express";
import dns from "dns"
import bodyParser from "body-parser";

const port = 8888;

interface Error {
    error: any
}

async function getApps(): Promise<string[] | Error> {
    let records;
    try {
        records = await dns.promises.resolveTxt(`_apps.internal`)
    } catch (error: any) {
        console.log(error);
        return {error: error}
    }

    const appset = records[0][0]
    if (appset === "") return [];

    return appset.split(",");
}

async function getAppRegions(appname: string): Promise<string[] | Error>  {
    let records;
    try {
        records = await dns.promises.resolveTxt(`regions.${appname}.internal`)
    } catch (error) {
        console.log(error);
        return {"error": error}
    }

    const appset = records[0][0]
    if (appset === "") return [];

    return appset.split(",");
}


async function getRegionInstances(region: string, appname: string) {
    let records;
    try {
        records = await dns.promises.resolve6(`${region}.${appname}.internal`)
    } catch (error) {
        console.log(error);
        return {"error": error}
    }
    return records;
}

async function getAllInstances(appname: string) {
    let records;
    try {
        records = await dns.promises.resolve6(`global.${appname}.internal`)
    } catch (error) {
        console.log(error);
        return {"error": error}
    }
    return records;
}

const appsHandler = async function (req: e.Request, res: e.Response) {
    const results = [];
    const apps = await getApps();

    if ("error" in apps) {
        res.status(400).send(apps.error);
        return;
    }

    results.push({allapps:apps});

    for (let app of apps) {
        const appregions = await getAppRegions(app);
        const appinstances = await getAllInstances(app);
        const regioninstances = [];

        if ("error" in appregions) {
            continue
        }

        for (let region of appregions) {
            const instances = await getRegionInstances(region, app)
            regioninstances.push({[region]: instances});
        }
        results.push({
            [app]: {
                "appregions": appregions,
                "appinstances": appinstances,
                "regioninstances": regioninstances
            }
        })
    }

    const resultJson = JSON.stringify(results, null, 2);

    res.send(resultJson);
}

const app = e();

app.get('/', function (req: e.Request, res: e.Response) {
    res.send(`
        <div><a href="/apps">List available apps in network</a></div>
        <div><a href="/ping">Ping resource</a></div>`
    );
})

app.get('/ping', function (req: e.Request, res: e.Response) {
    res.send(`
        <form action="/ping" method="post">
            <label for="addr">Addr:</label>
            <input type="text" id="addr" name="addr" value="https://google.com">
            <input type="submit" value="Submit">
        </form>
    `);
})

const urlencodedParser = bodyParser.urlencoded({ extended: false })

app.post('/ping', urlencodedParser, function (req: e.Request, res: e.Response) {
    res.send(req.body.addr)
})

app.get('/apps', appsHandler)

app.listen(port, () => {
    console.log(`6PN Private Net Helper app listening at http://localhost:${port}`)
})
