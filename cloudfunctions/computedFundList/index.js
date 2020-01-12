// 云函数入口文件
const cloud = require('wx-server-sdk');
cloud.init();

function computeFundObjByLine(name, fundLine, funds, param, fundParam) {
  const fundObj = {
    name
  };

  const fundItem = funds.find(item => item.name === name);
  fundParam.forEach(fundParamItem => {
    if (fundParamItem === 'name') {
      const info = new RegExp(fundItem[fundParamItem]).exec(fundLine);
      // console.log(info);
      fundLine = fundLine.slice(info.index + info[0].length);
    } else if (fundItem[fundParamItem]) {
      const info = new RegExp(param[fundParamItem].regex).exec(fundLine);
      // console.log(info);
      fundObj[fundParamItem] = info[0];
      fundLine = fundLine.slice(info.index + info[0].length);
    }
  });

  return {
    fundObj
  };
}

// 云函数入口函数
exports.main = async(event, context) => {
  const {
    cloudPath,
    fileID
  } = event;

  const {
    result,
    resultBak
  } = (await cloud.callFunction({
    name: 'getOCRdata',
    data: {
      cloudPath,
      fileID
    }
  })).result;

  const {
    funds,
    param,
    fundParam
  } = (await cloud.callFunction({
    name: 'constant'
  })).result;


  let str = '';
  result.forEach(item => {
    str = str + item.words;
  });

  let strBak = '';
  resultBak.forEach(item => {
    strBak = strBak + item.words;
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

  funds.forEach(async fundItem => {
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
      // console.log(fundLine);
      const {
        fundObj
      } = computeFundObjByLine(fundItem.name, fundLine, funds, param, fundParam);
      // console.log(fundObj);
      OCRdata.funds.push(fundObj);
      // console.log(OCRdata.funds);
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