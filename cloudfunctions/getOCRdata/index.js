// 云函数入口文件
const cloud = require('wx-server-sdk');
const AipOcrClient = require("baidu-aip-sdk").ocr;
const HttpClient = require("baidu-aip-sdk").HttpClient;

cloud.init();

HttpClient.setRequestOptions({
  timeout: 5000
});

// 云函数入口函数
exports.main = async(event, context) => {
  const {
    cloudPath,
    fileID
  } = event;

  const {
    APP_ID,
    API_KEY,
    SECRET_KEY
  } = (await cloud.callFunction({
    name: 'key'
  })).result;

  const client = new AipOcrClient(APP_ID, API_KEY, SECRET_KEY);

  // console.log(fileID)
  const buffer = (await cloud.downloadFile({
    fileID
  })).fileContent;
  const image = buffer.toString("base64");

  const result = await new Promise((res, _) => {
    client.accurateBasic(image).then(function(result) {
      res(result.words_result);
    }).catch(function(err) {
      res(err);
    });
  });

  const resultBak = await new Promise((res, _) => {
    client.generalBasic(image).then(function(result) {
      res(result.words_result);
    }).catch(function(err) {
      res(err);
    });
  });
  return {
    result,
    resultBak
  }
}