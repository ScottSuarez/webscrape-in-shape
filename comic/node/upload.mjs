import imgurLegacy from "imgur-legacy"
import path from "path"
import fs from "fs"
import fetch from 'node-fetch'

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


async function uploadImage(src, albumId) {
    let resp = await fetch('https://api.imgur.com/3/upload', { method: 'POST', 
        headers: {
            'Authorization': 'Bearer ' + authToken, 
            'Content-Type': 'application/json'
        }, 
        body: {
            image: (fs.readFileSync(src)).toString('base64'),
            album: albumId,
            type: 'base64'
        }}).catch(err => {
            console.log(err)
        })
    postRateLimit = parseInt(resp.headers.get('x-post-rate-limit-remaining'))
    return resp
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
    var album = await imgurLegacy.createAlbum()
    console.log('created album ' + album.id)
    for(var i=0; i<pages.length; i++){
        console.log(' ^ page ' + i )
        await uploadImage(pages[i], album.id)
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

