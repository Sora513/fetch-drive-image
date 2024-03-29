const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const { authenticate } = require('@google-cloud/local-auth');
const { google } = require('googleapis');
const { createWriteStream } = require("fs")


// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive.metadata.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

var pictureIdList = []

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file comptible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

/**
 * Lists the names and IDs of up to 10 files.
 * @param {OAuth2Client} authClient An authorized OAuth2 client.
 */
async function listFiles(authClient) {
  const drive = google.drive({ version: 'v3', auth: authClient });
  const folderId = "1--HiUNTjdX7M_BxIQpF3SlrZoTFCTMdW"
  //検索クエリとしてfolderIdをいれる、andで複数条件、mimetypeも指定できる
  const res = await drive.files.list({
    q: `'${folderId}' in parents`,
    fields: 'nextPageToken, files(id, name)',
  });
  const files = res.data.files;
  if (files.length === 0) {
    console.log('No files found.');
    return;
  }

  console.log('Making pictureIdList...');

  files.map((file) => {
    pictureIdList.push({
      id: file.id,
      name: file.name
    })
  });
  console.log(pictureIdList)

  const dest = createWriteStream("./image/" + "Hello.png")
  try {
    const res = await drive.files.get(
      {
        fileId: "1-NCRLHMtDGtOg6JzlaYJTG1_8bpDevgc",
        alt: "media"
      }, {
      responseType: "stream"
    }
    )
    res.data.on("data", chunk => dest.write(chunk))
    res.data.on("end", () => dest.end())
  } catch (err) {
    console.error(err)
  }

  drive.files.get({
    fileId: "1-NCRLHMtDGtOg6JzlaYJTG1_8bpDevgc",
    alt: "media"
  }, {
    responseType: "arraybuffer"
  }
  ).on("end", () => {
    console.log("done")
  }).on("error", (err) => {
    console.error(err)
  }).pipe(dest)
}


async function getImage(authClient) {
  const drive = google.drive({ version: 'v3', auth: authClient });




  // pictureIdList.map((file) => {
  //   const dest = createWriteStream("./image/" + file.name)
  //   drive.files.get({
  //     fileId: file.id,
  //     alt: "media"
  //   }, {
  //     responseType: "arraybuffer"
  //   },
  //     (err, res) => {
  //       if(err){
  //         console.error(err)
  //       }
  //       dest.write(Buffer.from(res.data))
  //     }
  //   )
  // })
}

authorize().then(listFiles).then(getImage).catch(console.error);