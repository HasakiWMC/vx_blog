// 云函数入口文件
const cloud = require('wx-server-sdk');
cloud.init();

const AipOcrClient = require("baidu-aip-sdk").ocr;
const HttpClient = require("baidu-aip-sdk").HttpClient;
HttpClient.setRequestOptions({
  timeout: 5000
});

// 云函数入口函数
exports.main = async(event, context) => {
  const {
    image
  } = event;

  const {
    funds,
    param
  } = (await cloud.callFunction({
    name: 'constant'
  })).result;

  const {
    APP_ID,
    API_KEY,
    SECRET_KEY
  } = (await cloud.callFunction({
    name: 'key'
  })).result;

  const client = new AipOcrClient(APP_ID, API_KEY, SECRET_KEY);

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


  let str = '';
  result.forEach(item => {
    str = str + item.words;
  });

  const fundIndexList = funds.map(fund => {
    return {
      key: fund.name,
      value: str.indexOf(fund.name)
    }
  });

  fundIndexList.sort((a, b) => a.value - b.value);

  // console.log(fundIndexList);

  const fundLineObj = {};
  for (let i = 0; i < fundIndexList.length - 1; i++) {
    fundLineObj[fundIndexList[i].key] = str.slice(fundIndexList[i].value, fundIndexList[i + 1].value);
  }

  let strBak = '';
  resultBak.forEach(item => {
    strBak = strBak + item.words;
  });

  const OCRdata = {
    date: '',
    funds: []
  }

  const datePattern = new RegExp(param.date.regex);
  const dateExecResult = datePattern.exec(str);
  if (dateExecResult) {
    OCRdata.date = dateExecResult[0];
  } else {
    console.error(`shit!!! cannot identify the date`);
  }

  const lackFunds = [];

  funds.forEach(fundItem => {
    let fundLinePattern = fundItem.name;
    Object.entries(fundItem).forEach(([key, value]) => {
      if (key !== 'name' && value) {
        fundLinePattern += param[key].regex;
      }
    });

    let fundLineExecResult = new RegExp(fundLinePattern).exec(str);
    if (!fundLineExecResult) {
      fundLineExecResult = new RegExp(fundLinePattern).exec(strBak);
      console.warn(`${fundItem.name} has no result, use backup result`);
    }
    if (fundLineExecResult) {
      let fundLine = fundLineExecResult[0];
      const fundObj = {
        name: fundItem.name,
      }
      Object.entries(fundItem).forEach(([key, value]) => {
        if (key === 'name') {
          const info = new RegExp(value).exec(fundLine);
          fundLine = fundLine.slice(info.index + info[0].length);
        } else if (value) {
          const info = new RegExp(param[key].regex).exec(fundLine);
          fundObj[key] = info[0];
          fundLine = fundLine.slice(info.index + info[0].length);
        }
      });
      OCRdata.funds.push(fundObj);
    } else {
      const errMsg = `shit!!! cannot identify the line of ${fundItem.name}`;
      console.error(errMsg);
      lackFunds.push({
        name: fundItem.name,
        line: fundLineObj[fundItem.name]
      });
    }
  });
  const res = {
    OCRdata,
    lackFunds
  };
  return res;
}