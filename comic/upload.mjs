import path from "path"
import fs from "fs"
import fetch from 'node-fetch'
import FormData from 'form-data'

const comic = "sandman"
const author = "Neil Gaiman"
const SRC = path.join(process.env.HOME, "Documents", "/comics/", comic)
const DEST = path.join("./series/", comic + ".json")
const chapterRegex = /chapter-(\d+)$/i
const authToken = process.env["IMGUR_AUTH"]
let postRateLimit = 2000000

if (authToken == '') {
    console.log('error: env variable `IMGUR_AUTH` not set ... exiting')
    
}
else {

    let manifestFile = getManifestFile()
    await uploadAllChapters(manifestFile)
}

async function createAlbum(){
    let resp = await fetch('https://api.imgur.com/3/album/', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + authToken, 
            'Content-Type': 'application/json'
        }, 
        
    })
    if(resp.status != 200){
        console.log(await resp.text())
        throw "unsuccessful album creation"
    }
    resp = JSON.parse(await resp.text())
    return resp.data
}

async function sleep(seconds){
    return new Promise(resolve => {
        setTimeout(resolve, seconds * 1000)
    })
}

async function uploadImageToImgur(formData){
    return await fetch('https://api.imgur.com/3/upload.json', { method: 'POST', 
        headers: {
            'Authorization': 'Bearer ' + authToken, 
        }, 
        body: formData
        }).catch(err => {
            console.log(err)
            throw err
        })
}

async function uploadImage(src, albumId) {
    var formData = new FormData()
    formData.append('type', 'file')
    formData.append('album', albumId)
    formData.append('image', fs.createReadStream(src))
    var resp = await uploadImageToImgur(formData)
    
    if (resp.status == 429) {
        console.log('got status 429.. waiting an hour and retrying upload request')
        console.log(await resp.text())
        await sleep(61 * 60) // sleep and hour and retry request
        resp = await uploadImageToImgur(formData)
    }

    if(resp.status != 200){
        console.log(await resp.text())
        throw "unsuccessful image upload"
    }
    postRateLimit = parseInt(resp.headers.get('x-post-rate-limit-remaining'))
    resp = JSON.parse(await resp.text())
    return resp.data
}

async function uploadImageWithRetry(src, albumId, numberOfTries){
    var resp = false
    for( var j=0; j<numberOfTries && !resp; j++) {
        resp = await uploadImage(src, albumId).catch(() => false)
        if (!resp) { 
            await sleep(5)  // if request fails wait 5 seconds and try again
        }
    }
    if (!resp) {
        throw "unable to upload full chapter"
    }
}

async function uploadChapter(src) {
    var pageRegex = /^page-(\d+)\.jpg$/i
    var pages = fs.readdirSync(src)
    pages = pages.filter(page => pageRegex.test(page))
    pages = pages.sort()
    pages = pages.map(page => path.resolve(path.join(src, page)))
    console.log(src)
    var chapterNumber = getChapterNumber(src)
    console.log("uploading chapter " + chapterNumber)
    var album = await createAlbum()
    console.log('created album ' + album.id)
    for(var i=0; i<pages.length; i++){
        console.log(' ^ page ' + i )
        await uploadImageWithRetry(pages[i], album.id, 3)
    }

    var chapterEntry = {}
    chapterEntry[chapterNumber] = {
        "title": `${comic} chapter ${chapterNumber}`,
        "volume": `volume ${chapterNumber}`,
        "groups": {
            "rawrrrr": `/proxy/api/imgur/chapter/${album.id}/`
        },
        "last_updated": `${Math.floor(Date.now() / 1000)}`,
        },
    
    console.log("uploaded chapter " + chapterNumber)
    console.log(JSON.stringify(chapterEntry))
    return chapterEntry
}

async function uploadAllChapters(manifest){
    var chapters = fs.readdirSync(SRC)
    chapters = chapters.filter(chapter => chapterRegex.test(chapter))
    for (let i=0; i<chapters.length; i++){
        var chapter = chapters[i]
        var chapterNumber = getChapterNumber(chapter)
        if (!manifest.chapters[chapterNumber]){
            if (postRateLimit < 100){
                console.log("approaching rate limit for day.. exiting to avoid overflow")
                return
            }
            var chapterEntry = await uploadChapter(path.join(SRC, chapter))
            manifest.chapters = {...manifest.chapters, ...chapterEntry}
            writeManifestFile(manifest)
            console.log(postRateLimit)
        }
    }
}

function getChapterNumber(chapterTitle){
    var chapterNumber = chapterRegex.exec(chapterTitle)[1]
    chapterNumber = `${parseInt(chapterNumber)}`
    return chapterNumber
}

function getManifestFile(){
    if(!fs.existsSync(DEST)) {
        // get first page of comic and link for cover
        return {
            "title" : comic,
            "description" : comic,
            "cover" : null,
            "author": author,
            "artist": author,
            "chapters": {
            }
        }
    }
    let rawdata = fs.readFileSync(DEST);
    let manifest = JSON.parse(rawdata);
    return manifest
}

function writeManifestFile(manifest) {
    fs.writeFileSync(DEST ,JSON.stringify(manifest, null, 2))
}

